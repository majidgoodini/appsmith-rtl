package com.appsmith.server.services;

import com.appsmith.external.constants.AnalyticsEvents;
import com.appsmith.external.helpers.AppsmithBeanUtils;
import com.appsmith.external.helpers.DataTypeStringUtils;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.constants.FieldName;
import com.appsmith.server.constants.LicenseOrigin;
import com.appsmith.server.constants.LicensePlan;
import com.appsmith.server.constants.LicenseStatus;
import com.appsmith.server.domains.License;
import com.appsmith.server.domains.QTenant;
import com.appsmith.server.domains.Tenant;
import com.appsmith.server.domains.TenantConfiguration;
import com.appsmith.server.dtos.UpdateLicenseKeyDTO;
import com.appsmith.server.exceptions.AppsmithError;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.featureflags.CachedFeatures;
import com.appsmith.server.helpers.RedirectHelper;
import com.appsmith.server.repositories.ApplicationRepository;
import com.appsmith.server.repositories.TenantRepository;
import com.appsmith.server.repositories.WorkspaceRepository;
import com.appsmith.server.services.ce.TenantServiceCEImpl;
import com.appsmith.server.solutions.EnvManager;
import com.appsmith.server.solutions.LicenseAPIManager;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.pf4j.util.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.http.codec.multipart.Part;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;
import reactor.util.function.Tuple2;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.appsmith.server.acl.AclPermission.MANAGE_TENANT;
import static com.appsmith.server.constants.CommonConstants.COLUMN;
import static com.appsmith.server.constants.CommonConstants.DEFAULT;
import static com.appsmith.server.constants.CommonConstants.DELIMETER_SPACE;
import static com.appsmith.server.constants.CommonConstants.FOR;
import static com.appsmith.server.constants.CommonConstants.IN;
import static com.appsmith.server.domains.TenantConfiguration.ASSET_PREFIX;
import static com.appsmith.server.repositories.ce.BaseAppsmithRepositoryCEImpl.fieldName;

@Service
@Slf4j
public class TenantServiceImpl extends TenantServiceCEImpl implements TenantService {

    private final LicenseAPIManager licenseAPIManager;
    private final SessionUserService sessionUserService;
    private final WorkspaceRepository workspaceRepository;
    private final ApplicationRepository applicationRepository;
    private final RedirectHelper redirectHelper;
    private final CacheableFeatureFlagHelper cacheableFeatureFlagHelper;
    private final AssetService assetService;
    private final ObjectMapper objectMapper;

    // Based on information provided on the Branding page.
    private static final int MAX_LOGO_SIZE_KB = 2048;
    private static final int MAX_FAVICON_SIZE_KB = 1024;

    @Autowired
    public TenantServiceImpl(
            Scheduler scheduler,
            Validator validator,
            MongoConverter mongoConverter,
            ReactiveMongoTemplate reactiveMongoTemplate,
            TenantRepository repository,
            WorkspaceRepository workspaceRepository,
            ApplicationRepository applicationRepository,
            AnalyticsService analyticsService,
            ConfigService configService,
            SessionUserService sessionUserService,
            LicenseAPIManager licenseAPIManager,
            RedirectHelper redirectHelper,
            AssetService assetService,
            ObjectMapper objectMapper,
            CacheableFeatureFlagHelper cacheableFeatureFlagHelper,
            @Lazy EnvManager envManager) {

        super(
                scheduler,
                validator,
                mongoConverter,
                reactiveMongoTemplate,
                repository,
                analyticsService,
                configService,
                envManager);
        this.licenseAPIManager = licenseAPIManager;
        this.sessionUserService = sessionUserService;
        this.redirectHelper = redirectHelper;
        this.workspaceRepository = workspaceRepository;
        this.applicationRepository = applicationRepository;
        this.assetService = assetService;
        this.objectMapper = objectMapper;
        this.cacheableFeatureFlagHelper = cacheableFeatureFlagHelper;
    }

    @Override
    public Mono<Tenant> findById(String id, AclPermission aclPermission) {
        return repository.findById(id, aclPermission);
    }

    @Override
    public Mono<Tenant> save(Tenant tenant) {
        return repository.save(tenant);
    }

    @Override
    public Mono<Tenant> getDefaultTenant(AclPermission aclPermission) {
        return repository.findBySlug(FieldName.DEFAULT, aclPermission);
    }

    @Override
    public Mono<Tenant> getTenantConfiguration() {
        return Mono.zip(this.getDefaultTenant(), super.getTenantConfiguration()).map(tuple -> {
            final Tenant dbTenant = tuple.getT1();
            final Tenant clientTenant = tuple.getT2();
            final TenantConfiguration config = clientTenant.getTenantConfiguration();

            if (org.springframework.util.StringUtils.hasText(System.getenv("APPSMITH_OAUTH2_OIDC_CLIENT_ID"))) {
                config.addThirdPartyAuth("oidc");
            }

            if ("true".equals(System.getenv("APPSMITH_SSO_SAML_ENABLED"))) {
                config.addThirdPartyAuth("saml");
            }

            return getClientPertinentTenant(dbTenant, clientTenant);
        });
    }

    /**
     * To add a license key to the default tenant and return redirect URL
     * @param licenseKey License key
     * @param exchange ServerWebExchange
     * @return Mono of String
     */
    public Mono<String> addLicenseKeyAndGetRedirectUrl(String licenseKey, ServerWebExchange exchange) {
        if (StringUtils.isNullOrEmpty(licenseKey)) {
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.LICENSE_KEY));
        }
        return saveTenantLicenseKey(licenseKey).flatMap(tuple -> sessionUserService
                .getCurrentUser()
                .flatMap(user -> workspaceRepository
                        .findFirstByIsAutoGeneratedWorkspaceAndEmailOrderByCreatedAt(true, user.getEmail())
                        .switchIfEmpty(Mono.error(new AppsmithException(
                                AppsmithError.NO_RESOURCE_FOUND,
                                DEFAULT + DELIMETER_SPACE + FieldName.WORKSPACE + FOR,
                                FieldName.USER + COLUMN + user.getId()))))
                .flatMap(workspace -> applicationRepository
                        .findFirstByWorkspaceId(workspace.getId())
                        .switchIfEmpty(Mono.error(new AppsmithException(
                                AppsmithError.NO_RESOURCE_FOUND,
                                DEFAULT + DELIMETER_SPACE + FieldName.APPLICATION + IN,
                                FieldName.WORKSPACE + COLUMN + workspace.getId()))))
                .map(application -> redirectHelper.buildSignupSuccessUrl(
                        redirectHelper.buildApplicationUrl(
                                application, exchange.getRequest().getHeaders()),
                        true)));
    }

    /**
     * Method to remove the default tenant's license key
     * @return Mono of Tenant
     */
    @Override
    public Mono<Tenant> removeLicenseKey() {
        Mono<Tenant> tenantMono = this.getDefaultTenant(MANAGE_TENANT)
                .switchIfEmpty(
                        Mono.error(new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.TENANT, DEFAULT)));

        return tenantMono.flatMap(tenant -> {
            if (!this.isValidLicenseConfiguration(tenant)) {
                return Mono.just(tenant);
            }
            License license = tenant.getTenantConfiguration().getLicense();
            final LicensePlan previousPlan = license.getPlan();
            license.setPlan(LicensePlan.FREE);
            license.setPreviousPlan(previousPlan);
            return licenseAPIManager.downgradeTenantToFreePlan(tenant).flatMap(isSuccessful -> {
                if (Boolean.TRUE.equals(isSuccessful)) {
                    tenant.getTenantConfiguration().setLicense(null);
                    return this.update(tenant.getId(), tenant)
                            .flatMap(updatedTenant -> this.forceUpdateTenantFeatures(updatedTenant.getId())
                                    .thenReturn(updatedTenant));
                }
                return Mono.error(new AppsmithException(AppsmithError.TENANT_DOWNGRADE_EXCEPTION));
            });
        });
    }

    /**
     * Method to sync current and previous license plan.
     * @return Mono of Tenant
     */
    @Override
    public Mono<Tenant> syncLicensePlans() {
        Mono<Tenant> tenantMono = this.getDefaultTenant(MANAGE_TENANT)
                .switchIfEmpty(
                        Mono.error(new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.TENANT, DEFAULT)));

        return tenantMono.flatMap(tenant -> {
            if (!this.isValidLicenseConfiguration(tenant)) {
                return Mono.just(tenant);
            }
            License license = tenant.getTenantConfiguration().getLicense();
            license.setPreviousPlan(license.getPlan());
            return this.update(tenant.getId(), tenant);
        });
    }

    /**
     * Method to fetch license details and update the default tenant's license key based on client request
     * Response will be status of update with 2xx
     * @param updateLicenseKeyDTO update license key DTO which includes license key and a boolean to selectively update DB states
     * @return Mono of Tenant
     */
    public Mono<Tenant> updateTenantLicenseKey(UpdateLicenseKeyDTO updateLicenseKeyDTO) {
        return saveTenantLicenseKey(updateLicenseKeyDTO.getKey(), updateLicenseKeyDTO.getIsDryRun())
                .map(tuple -> getClientPertinentTenant(tuple.getT1(), null));
    }

    /**
     * To validate and save the license key in the DB and send corresponding analytics event
     * Only valid license keys will be saved in the DB
     * @param licenseKey License key
     * @return Mono of Tuple<Tenant, Boolean>
     */
    private Mono<Tuple2<Tenant, Boolean>> saveTenantLicenseKey(String licenseKey) {
        return this.saveTenantLicenseKey(licenseKey, Boolean.FALSE);
    }

    /**
     * Method to validate and save the license key in the DB and send corresponding analytics event
     * License will be saved to DB if
     *  - It's a valid license keys
     *  - isDryRun : false
     * @param licenseKey    License key
     * @param isDryRun      Variable to selectively save the license to DB
     * @return Mono of Tuple<Tenant, Boolean>
     */
    private Mono<Tuple2<Tenant, Boolean>> saveTenantLicenseKey(String licenseKey, Boolean isDryRun) {
        License license = new License();
        // TODO: Update to getCurrentTenant when multi tenancy is introduced
        return repository
                .findBySlug(FieldName.DEFAULT, MANAGE_TENANT)
                .switchIfEmpty(Mono.error(
                        new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.TENANT, FieldName.DEFAULT)))
                .flatMap(tenant -> {
                    TenantConfiguration tenantConfiguration = tenant.getTenantConfiguration();
                    boolean isActivateInstance = tenantConfiguration.getLicense() == null
                            || StringUtils.isNullOrEmpty(
                                    tenantConfiguration.getLicense().getKey());

                    AppsmithBeanUtils.copyNestedNonNullProperties(tenantConfiguration.getLicense(), license);
                    license.setKey(licenseKey);
                    tenantConfiguration.setLicense(license);
                    tenant.setTenantConfiguration(tenantConfiguration);
                    return checkTenantLicense(tenant).zipWith(Mono.just(isActivateInstance));
                })
                .flatMap(tuple -> {
                    Tenant tenant = tuple.getT1();
                    boolean isActivateInstance = tuple.getT2();
                    License license1 = tenant.getTenantConfiguration().getLicense();
                    AnalyticsEvents analyticsEvent = isActivateInstance
                            ? AnalyticsEvents.ACTIVATE_NEW_INSTANCE
                            : AnalyticsEvents.UPDATE_EXISTING_LICENSE;
                    Map<String, Object> analyticsProperties = Map.of(
                            FieldName.LICENSE_KEY,
                                    StringUtils.isNullOrEmpty(license1.getKey())
                                            ? ""
                                            : DataTypeStringUtils.maskString(license1.getKey(), 8, 32, 'x'),
                            FieldName.LICENSE_VALID,
                                    license1.getStatus() != null && LicenseStatus.ACTIVE.equals(license1.getStatus()),
                            FieldName.LICENSE_TYPE, license1.getType() == null ? "" : license1.getType(),
                            FieldName.LICENSE_STATUS, license1.getStatus() == null ? "" : license1.getStatus());
                    Mono<Tenant> analyticsEventMono =
                            analyticsService.sendObjectEvent(analyticsEvent, tenant, analyticsProperties);
                    // Update/save license only in case of a valid license key
                    if (!Boolean.TRUE.equals(
                            tenant.getTenantConfiguration().getLicense().getActive())) {
                        return analyticsEventMono.then(
                                Mono.error(new AppsmithException(AppsmithError.INVALID_LICENSE_KEY_ENTERED)));
                    }

                    Mono<Tenant> tenantMono;
                    if (Boolean.TRUE.equals(isDryRun)) {
                        tenantMono = Mono.just(tenant);
                    } else {
                        tenantMono = this.save(tenant)
                                .flatMap(savedTenant -> this.forceUpdateTenantFeatures(savedTenant.getId())
                                        .thenReturn(savedTenant));
                    }
                    return tenantMono.flatMap(analyticsEventMono::thenReturn).zipWith(Mono.just(isActivateInstance));
                });
    }

    /**
     * To refresh the current license status in the DB by making a license validation request to the Cloud Services and
     * return latest license status
     * @return Mono of Tenant
     */
    public Mono<Tenant> refreshAndGetCurrentLicense() {
        // TODO: Update to getCurrentTenant when multi tenancy is introduced
        return repository
                .findBySlug(FieldName.DEFAULT, MANAGE_TENANT)
                .switchIfEmpty(Mono.error(
                        new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.TENANT, FieldName.DEFAULT)))
                .flatMap(this::checkTenantLicense)
                .flatMap(this::save)
                .map(tenant -> getClientPertinentTenant(tenant, null));
    }

    /**
     * To check the status of a license key associated with the tenant
     * @param tenant Tenant
     * @return Mono of Tenant
     */
    private Mono<Tenant> checkTenantLicense(Tenant tenant) {
        Mono<License> licenseMono = licenseAPIManager.licenseCheck(tenant).onErrorResume(throwable -> {
            Objects.requireNonNull(this.checkAndUpdateLicenseExpiryWithinInstance(tenant))
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe();
            log.debug("Error while validating license: {}", throwable.getMessage(), throwable);
            return Mono.error(throwable);
        });
        return licenseMono.map(license -> {
            // To prevent empty License object being saved in DB for license checks with empty license key
            if (!StringUtils.isNullOrEmpty(license.getKey())) {
                TenantConfiguration tenantConfiguration = tenant.getTenantConfiguration();
                tenantConfiguration.setLicense(license);
                tenant.setTenantConfiguration(tenantConfiguration);
            }
            return tenant;
        });
    }

    /**
     * To check and update the status of default tenant's license
     * This can be used for periodic license checks via scheduled jobs
     * @return Mono of Tenant
     */
    public Mono<Tenant> checkAndUpdateDefaultTenantLicense() {
        return this.getDefaultTenant().flatMap(this::checkTenantLicense).flatMap(this::save);
    }

    /**
     * To check whether a tenant have valid license configuration
     * @param tenant Tenant
     * @return Boolean
     */
    public Boolean isValidLicenseConfiguration(Tenant tenant) {
        return tenant.getTenantConfiguration() != null
                && tenant.getTenantConfiguration().getLicense() != null
                && tenant.getTenantConfiguration().getLicense().getKey() != null;
    }

    @Override
    public Mono<Boolean> isEnterprisePlan(String tenantId) {
        Mono<License> licenseMono = getTenantLicense(tenantId);
        return licenseMono
                .map(license ->
                        license.getActive() && getEnterpriseLicenseOrigins().contains(license.getOrigin()))
                .switchIfEmpty(Mono.just(Boolean.FALSE));
    }

    @Override
    public Mono<License> getTenantLicense(String tenantId) {
        List<String> includeFields = List.of(
                fieldName(QTenant.tenant.id),
                fieldName(QTenant.tenant.tenantConfiguration) + "."
                        + fieldName(QTenant.tenant.tenantConfiguration.license));
        Mono<Tenant> tenantMono = repository.findById(tenantId, includeFields, null);
        return tenantMono.flatMap(tenant -> {
            if (Objects.isNull(tenant.getTenantConfiguration())
                    || Objects.isNull(tenant.getTenantConfiguration().getLicense())) {
                return Mono.empty();
            }
            return Mono.just(tenant.getTenantConfiguration().getLicense());
        });
    }

    @Override
    public Mono<Tenant> updateDefaultTenantConfiguration(
            Mono<String> tenantConfigAsStringMono, Mono<Part> brandLogoMono, Mono<Part> brandFaviconMono) {
        Mono<Tenant> defaultTenantMono =
                getDefaultTenant(AclPermission.MANAGE_TENANT).cache();
        Mono<String> brandLogoAssetIdMono = brandLogoMono
                .flatMap(brandLogoFile -> uploadFileAndGetFormattedAssetId(brandLogoFile, MAX_LOGO_SIZE_KB))
                .switchIfEmpty(Mono.just(""));
        Mono<String> brandFaviconAssetIdMono = brandFaviconMono
                .flatMap(brandFaviconFile -> uploadFileAndGetFormattedAssetId(brandFaviconFile, MAX_FAVICON_SIZE_KB))
                .switchIfEmpty(Mono.just(""));
        Mono<TenantConfiguration> newBrandConfigMono = tenantConfigAsStringMono
                .flatMap(tenantConfigurationAsString -> {
                    try {
                        return Mono.just(
                                objectMapper.readValue(tenantConfigurationAsString, TenantConfiguration.class));
                    } catch (JsonProcessingException e) {
                        return Mono.error(new AppsmithException(
                                AppsmithError.GENERIC_BAD_REQUEST, "Invalid Tenant configuration"));
                    }
                })
                .switchIfEmpty(Mono.just(new TenantConfiguration()));

        return Mono.zip(defaultTenantMono, brandLogoAssetIdMono, brandFaviconAssetIdMono, newBrandConfigMono)
                .flatMap(tuple4 -> {
                    Tenant defaultTenant = tuple4.getT1();
                    String brandLogoAssetId = tuple4.getT2();
                    String brandFaviconAssetId = tuple4.getT3();
                    TenantConfiguration updateForTenantConfig = tuple4.getT4();

                    if (org.apache.commons.lang3.StringUtils.isNotEmpty(brandLogoAssetId)) {
                        updateForTenantConfig.setWhiteLabelLogo(brandLogoAssetId);
                    }

                    if (org.apache.commons.lang3.StringUtils.isNotEmpty(brandFaviconAssetId)) {
                        updateForTenantConfig.setWhiteLabelFavicon(brandFaviconAssetId);
                    }

                    return updateTenantConfiguration(defaultTenant.getId(), updateForTenantConfig);
                })
                .flatMap(updatedTenant -> getTenantConfiguration());
    }

    /**
     * Currently {@link License}.{@link LicenseOrigin} is set to ENTERPRISE & AIR_GAP for Enterprise and AirGapped respectively.
     * Hence we use a set of ENTERPRISE & AIR_GAP as EnterPrise License Origins
     */
    private Set<LicenseOrigin> getEnterpriseLicenseOrigins() {
        return Set.of(LicenseOrigin.ENTERPRISE, LicenseOrigin.AIR_GAP);
    }

    private Mono<Tenant> checkAndUpdateLicenseExpiryWithinInstance(Tenant tenant) {
        if (StringUtils.isNullOrEmpty(tenant.getId())) {
            return Mono.just(tenant);
        }
        TenantConfiguration tenantConfiguration =
                tenant.getTenantConfiguration() != null ? tenant.getTenantConfiguration() : new TenantConfiguration();

        License license = tenantConfiguration.getLicense() != null ? tenantConfiguration.getLicense() : new License();

        // TODO: Update the check from plain timestamp so that user should not be able to tamper the DB resource
        if (license.getExpiry() == null || license.getExpiry().isBefore(Instant.now())) {
            license.setActive(false);
            license.setStatus(LicenseStatus.EXPIRED);
            tenantConfiguration.setLicense(license);
            tenant.setTenantConfiguration(tenantConfiguration);
            return this.save(tenant);
        }
        return Mono.just(tenant);
    }

    private TenantConfiguration.BrandColors getUpdatedBrandColors(
            TenantConfiguration.BrandColors currentBrandColors, TenantConfiguration.BrandColors newBrandColors) {
        if (Objects.isNull(currentBrandColors)) {
            return newBrandColors;
        }
        AppsmithBeanUtils.copyNestedNonNullProperties(newBrandColors, currentBrandColors);
        return currentBrandColors;
    }

    private Mono<String> uploadFileAndGetFormattedAssetId(Part partFile, int maxFileSizeKB) {
        return assetService
                .upload(List.of(partFile), maxFileSizeKB, false)
                .map(brandLogoAsset -> ASSET_PREFIX + brandLogoAsset.getId());
    }

    private Mono<CachedFeatures> forceUpdateTenantFeatures(String tenantId) {
        return cacheableFeatureFlagHelper
                .evictCachedTenantNewFeatures(tenantId)
                .then(cacheableFeatureFlagHelper.fetchCachedTenantNewFeatures(tenantId));
    }
}
