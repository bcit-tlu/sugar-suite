<!-- markdownlint-disable no-bare-urls no-inline-html -->
# sugar-suite

![Version: 1.1.5](https://img.shields.io/badge/Version-1.1.5-informational?style=flat-square) ![AppVersion: 1.1.5](https://img.shields.io/badge/AppVersion-1.1.5-informational?style=flat-square)

Sugar-Suite is a "Framework Factory" used to produce customized stylesheets designed for building online courses in HTML.

**Homepage:** <https://sugar-suite.ltc.bcit.ca>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| BCIT LTC | <ltc_techops@bcit.ca> | <https://www.bcit.ca/learning-teaching-centre/> |

## Installing the Chart

Our registry images are public, but in ["Working with Container Registries"](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) GitHub says:
> "You need an access token to publish, install, and delete private, internal, and public packages."

1. Create a [GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and set it in your terminal shell:

    ```console
    export CR_PAT=YOUR_TOKEN
    ```

1. Install [Helm](https://helm.sh/docs/intro/install) and [jq](https://jqlang.org/download/).

1. Login to the global GitHub registry service:

    ```console
    echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
    ```

1. List the available registry tags

    ```console
    curl -L \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $CR_PAT" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    https://api.github.com/orgs/bcit-ltc/packages/container/sugar-suite/versions \
    | jq '.[].metadata.container.tags.[]'
    ```

1. Pull and inspect the helm chart:

    ```console
    helm pull --untar oci://ghcr.io/bcit-ltc/sugar-suite --version {VERSION}
    ```

1. Install the chart:

    ```console
    helm install sugar-suite .
    ```

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://bcit-ltc.github.io/helm-charts | apps-common | >=0.3.4 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| frontend | object | `{}` | Main "frontend" configuration |
| frontend.configEnvs | list | `[]` | configEnvs create ConfigMaps that are passed to containers using envFrom |
| frontend.configMounts | list | `[]` | volumeMounts to be added as configMaps. Requires matching configs. |
| frontend.emptyDirMounts | list | `[{name: tmp, mountPath: /tmp}]` | volumeMounts for the frontend container that also create corresponding `emptyDir` volumes in the pod. |
| frontend.enabled | bool | `true` | Enable or disable frontend components. |
| frontend.extraEnvVars | list | `[]` | List of extra environment variables that are set literally. |
| frontend.image.pullPolicy | string | `"IfNotPresent"` | Frontend image default pull policy |
| frontend.image.registry | string | `"ghcr.io"` | Frontend image registry |
| frontend.image.repository | string | `"bcit-ltc/sugar-suite"` | Frontend image repository |
| frontend.image.tag | string | `"1.1.5"` | Frontend image tag |
| frontend.includeConfigAnnotation | bool | `false` | Add a checksum annotation to the server pods that is a hash    of the configuration. Can be used to identify configuration changes. |
| frontend.livenessProbe.enabled | bool | `false` | Enables livenessProbe |
| frontend.name | string | `"sugar-suite"` | The name of the frontend container to create. If empty uses "frontend" |
| frontend.port | int | `8080` | Port on which the frontend is listening |
| frontend.readinessProbe.enabled | bool | `false` | Enables readinessProbe |
| frontend.resources.limits | object | `{"cpu":"250m","memory":"256Mi"}` | Resource limits mapped directly to the value of    the resources field for a PodSpec. |
| frontend.resources.requests | object | `{"cpu":"100m","memory":"64Mi"}` | Resource requests mapped directly to the value of    the resources field for a PodSpec. |
| frontend.securityContext | object | `{"container":{}}` | Security context for the frontend container. Default:<br> &nbsp;&nbsp;`readOnlyRootFilesystem: true`<br> &nbsp;&nbsp;`allowPrivilegeEscalation: false`<br> &nbsp;&nbsp;`capabilities:`<br> &nbsp;&nbsp;&nbsp;&nbsp;`drop`:<br> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`- ALL`<br> - Set to `null` to disable |
| frontend.startupProbe.enabled | bool | `false` | Enables startupProbe |
| frontend.storageMounts | string | `[]` | volumeMounts to be added as secrets |
| global.imagePullSecrets | list | `[]` |  |
| global.name | string | `"sugar-suite"` | Authoritative name |
| global.progressDeadlineSeconds | int | `600` |  |
| global.revisionHistoryLimit | int | `3` |  |
| ingress | object | `{}` | Creates an ingress for external access |
| ingress.defaultDomain | string | `""` | Default domain for the ingress |
| ingress.extraPaths | list | `[]` | Extra path rules to render verbatim before the default "/". |
| ingress.pathType | string | `"Prefix"` | Path type for the default route ("/") |
| ingress.tlsSecret | string | `""` | TLS secret to use. Sets `<spec.tls.hosts>` to `<global.name>.<defaultDomain>` |
| initContainer.image | object | `{}` |  |
| processor | object | `{}` | Main "backend" configuration |
| processor.configEnvs | list | `[]` | Create `ConfigMap` resources that are passed to containers using envFrom |
| processor.configMounts | list | `[]` | volumeMounts to be added as configMaps. Requires matching configs. |
| processor.emptyDirMounts | list | `[]` | volumeMounts for the processor container that also create corresponding emptyDir volumes in the pod. |
| processor.enabled | bool | `false` | Enable or disable processor components. |
| processor.extraEnvVars | list | `[]` | List of extra environment variables that are set literally. |
| processor.image.pullPolicy | string | `"IfNotPresent"` | Processor image default pull policy |
| processor.image.registry | string | `"ghcr.io"` | Processor imageregistry |
| processor.image.repository | string | `""` | Processor image repository |
| processor.image.tag | string | `""` | Processor image tag |
| processor.port | int | `8000` | Port on which processor is listening |
| processor.replicas | int | `1` | Number of replicas for the processor |
| processor.secretMounts | list | `[]` | volumeMounts to be added as secrets |
| processor.securityContext | object | `{"container":null}` | Security context for the processor container. Default:<br> &nbsp;&nbsp;`readOnlyRootFilesystem: true`<br> &nbsp;&nbsp;`allowPrivilegeEscalation: false`<br> &nbsp;&nbsp;`capabilities:`<br> &nbsp;&nbsp;&nbsp;&nbsp;`drop`:<br> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`- ALL`<br> - Set to `null` to disable |
| securityContext | object | `{"pod":{}}` | Security context for the pod template<br>   &nbsp;&nbsp;`runAsNonRoot: true`<br>   &nbsp;&nbsp;`runAsGroup: 101`<br>   &nbsp;&nbsp;`runAsUser: 101`<br>   &nbsp;&nbsp;`fsGroup: 101`<br> - Set to `null` to disable |
| service | object | `{}` | Enables a service for the app |
| service.enabled | bool | `true` | Enable or disable service components. |
| service.port | int | `8080` | Port on which the app is listening |
| service.targetPort | int | `8080` | Target port to which the service should be mapped to |
| service.type | string | `"ClusterIP"` | Service type: by default, connect to the app using an internal cluster IP |
| serviceAccount | object | `{}` | Configuration for the service account |
| serviceAccount.create | bool | `true` | Enable or disable service account creation. |
| serviceAccount.name | string | `""` | Name of the service account to create. If empty uses global.name |

## Building/updating README.md

```console
docker run -it --volume "$(pwd):/helm-docs" -u $(id -u) jnorwood/helm-docs:latest helm-docs --template-files=./files/_README.md.gotmpl
```

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.14.2](https://github.com/norwoodj/helm-docs/releases/v1.14.2)
