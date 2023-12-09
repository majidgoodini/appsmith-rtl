package com.appsmith.server.repositories.ce;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.Page;
import com.appsmith.server.repositories.BaseAppsmithRepositoryImpl;
import com.appsmith.server.repositories.CacheableRepositoryHelper;
import org.springframework.data.mongodb.core.ReactiveMongoOperations;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.springframework.data.mongodb.core.query.Criteria.where;

public class CustomPageRepositoryCEImpl extends BaseAppsmithRepositoryImpl<Page> implements CustomPageRepositoryCE {

    public CustomPageRepositoryCEImpl(
            ReactiveMongoOperations mongoOperations,
            MongoConverter mongoConverter,
            CacheableRepositoryHelper cacheableRepositoryHelper) {
        super(mongoOperations, mongoConverter, cacheableRepositoryHelper);
    }

    @Override
    public Optional<Page> findByIdAndLayoutsId(String id, String layoutId, AclPermission aclPermission) {

        Criteria idCriteria = getIdCriteria(id);
        String layoutsIdKey = "layouts" + "." + "id";
        Criteria layoutCriteria = where(layoutsIdKey).is(layoutId);

        List<Criteria> criterias = List.of(idCriteria, layoutCriteria);
        return queryOne(criterias, aclPermission);
    }

    @Override
    public Optional<Page> findByName(String name, AclPermission aclPermission) {
        Criteria nameCriteria = where("name").is(name);
        return queryOne(List.of(nameCriteria), aclPermission);
    }

    @Override
    public List<Page> findByApplicationId(String applicationId, AclPermission aclPermission) {
        return Collections.emptyList(); /*
        Criteria applicationIdCriteria =
                where("applicationId").is(applicationId);
        return queryAll(List.of(applicationIdCriteria), aclPermission);*/
    }

    @Override
    public Optional<Page> findByNameAndApplicationId(String name, String applicationId, AclPermission aclPermission) {
        Criteria nameCriteria = where("name").is(name);
        Criteria applicationIdCriteria = where("applicationId").is(applicationId);
        return queryOne(List.of(nameCriteria, applicationIdCriteria), aclPermission);
    }
}