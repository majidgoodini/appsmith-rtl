package com.appsmith.external.models;

import com.appsmith.external.exceptions.ErrorDTO;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonView;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.Transient;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class ActionDTO {

    @Transient
    private String id;

    @Transient
    String applicationId;

    @Transient
    String workspaceId;

    @Transient
    PluginType pluginType;

    // name of the plugin. used to log analytics events where pluginName is a required attribute
    // It'll be null if not set
    @Transient
    String pluginName;

    @Transient
    String pluginId;

    String name;

    // The FQN for an action will also include any collection it is a part of as collectionName.actionName
    String fullyQualifiedName;

    Datasource datasource;

    String pageId;

    String collectionId;

    ActionConfiguration actionConfiguration;

    //this attribute carries error messages while processing the actionCollection
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Transient
    List<ErrorDTO> errorReports;

    Boolean executeOnLoad;

    Boolean clientSideExecution;

    /*
     * This is a list of fields specified by the client to signify which fields have dynamic bindings in them.
     * TODO: The server can use this field to simplify our Mustache substitutions in the future
     */
    List<Property> dynamicBindingPathList;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Boolean isValid;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Set<String> invalids;

    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Set<String> messages = new HashSet<>();


    // This is a list of keys that the client whose values the client needs to send during action execution.
    // These are the Mustache keys that the server will replace before invoking the API
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Set<String> jsonPathKeys;

    @JsonView(Views.Internal.class)
    String cacheResponse;

    @Transient
    String templateId; //If action is created via a template, store the id here.

    @Transient
    String providerId; //If action is created via a template, store the template's provider id here.

    @Transient
    ActionProvider provider;

    @JsonView(Views.Internal.class)
    Boolean userSetOnLoad = false;

    Boolean confirmBeforeExecute = false;

    @Transient
    Documentation documentation;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    Instant deletedAt = null;

    @Deprecated
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    Instant archivedAt = null;

    @Transient
    @JsonView(Views.Internal.class)
    protected Set<Policy> policies = new HashSet<>();

    @Transient
    public Set<String> userPermissions = new HashSet<>();

    // This field will be used to store the default/root actionId and applicationId for actions generated for git
    // connected applications and will be used to connect actions across the branches
    @JsonView(Views.Internal.class)
    DefaultResources defaultResources;

    /**
     * If the Datasource is null, create one and set the autoGenerated flag to true. This is required because spring-data
     * cannot add the createdAt and updatedAt properties for null embedded objects. At this juncture, we couldn't find
     * a way to disable the auditing for nested objects.
     *
     * @return
     */
    public Datasource getDatasource() {
        if (this.datasource == null) {
            this.datasource = new Datasource();
            this.datasource.setIsAutoGenerated(true);
        }
        return datasource;
    }

    public String getValidName() {
        if (this.fullyQualifiedName == null) {
            return this.name;
        } else {
            return this.fullyQualifiedName;
        }
    }

    public void sanitiseToExportDBObject() {
        this.setDefaultResources(null);
        this.setCacheResponse(null);
        if (this.getDatasource() != null) {
            this.getDatasource().setCreatedAt(null);
        }
        if (this.getUserPermissions() != null) {
            this.getUserPermissions().clear();
        }
        if (this.getPolicies() != null) {
            this.getPolicies().clear();
        }
    }
}
