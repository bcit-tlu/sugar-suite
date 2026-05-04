{{/*
Expand the name of the chart.
*/}}
{{- define "sugar-suite.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Deduplicates when the release name already contains the chart name.
*/}}
{{- define "sugar-suite.fullname" -}}
{{- if contains .Chart.Name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sugar-suite.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "sugar-suite.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sugar-suite.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sugar-suite.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
