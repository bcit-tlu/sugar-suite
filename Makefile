# Prefer zsh, fall back to bash
SHELL := $(shell command -v zsh 2>/dev/null || command -v bash)

# Only set ZDOTDIR if the Make shell is zsh
ifeq ($(notdir $(SHELL)),zsh)
  export ZDOTDIR := $(CURDIR)/.devcontainer/scripts
endif

# ---------- Constants / paths ----------
SCRIPTS    := $(CURDIR)/.devcontainer/scripts
ENVSH      := $(SCRIPTS)/env.sh
LIBSH      := $(SCRIPTS)/lib.sh
K3D_CFG    := $(CURDIR)/.devcontainer/k3d/k3d.yaml

# ---------- Required CLI tools ----------
TOOLS := docker oras kubectl skaffold k3d git-lfs yq helm

# Tool discovery (only those referenced directly in this Makefile)
K3D    := $(shell command -v k3d)
DOCKER := $(shell command -v docker)
ORAS   := $(shell command -v oras)

# Helper macros
REQUIRE = @test -n "$($(1))" || { echo "❗ Set $(1) in $(2)"; exit 1; }

# Targets
.PHONY: help
help:
	@echo ""
	@echo "Targets:"
	@echo ""
	@echo "  check       → quick sanity checks (tools, env)"
	@echo ""
	@echo "  docker compose up	→ local dev"
	@echo "  cluster     		→ create local k3d cluster"
	@echo "  skaffold dev      	→ build + deploy to local cluster to verify deployment/helm release"
	@echo ""
	@echo ""
	@echo "Other devcontainer commands:"
	@echo ""
	@echo "  delete      → delete all k3d clusters (local dev cleanup)"
	@echo "  dashboard   → install Kubernetes Dashboard and print login token"
	@echo "  token       → re-print Kubernetes Dashboard login token"
	@echo "  chart       → pull/unpack app chart (clobbers existing files)"
	@echo "                  - set APP_CHART_URL to override default \"oci://ghcr.io/$${ORG_NAME}/oci/$${APP_NAME}\""
	@echo ""
	@echo "  nix-shell -p {binary}              → run tools from a temporary nix shell"
	@echo "  helm repo add {repoName} {repoURL}  → add a helm repository"
	@echo "  kubeconform|kubeval {file}          → validate Kubernetes YAML files"
	@echo ""

.PHONY: cluster
cluster:
	@. "$(ENVSH)"; . "$(LIBSH)"; \
	"$(SCRIPTS)/cluster.sh"; \
	$(MAKE) chart

.PHONY: dashboard
dashboard:
	@. "$(ENVSH)"; . "$(LIBSH)"; \
	"$(SCRIPTS)/kubernetes-dashboard.sh"

.PHONY: chart
chart:
	@. "$(ENVSH)"; . "$(LIBSH)"; \
	"$(SCRIPTS)/app-chart.sh"

.PHONY: token
token:
	@. "$(ENVSH)"; \
	if [ -s "$$TOKEN_PATH" ]; then \
	  echo "[token] file: $$TOKEN_PATH"; \
	  echo "---- TOKEN ----"; \
	  cat "$$TOKEN_PATH"; echo; \
	else \
	  echo "No token found. Run 'make dashboard' first."; \
	  exit 1; \
	fi

.PHONY: delete
delete:
	@echo "❌ Deleting all k3d clusters..."
	@. "$(ENVSH)"; \
	if [ -z "$(K3D)" ]; then echo "k3d not found"; exit 127; fi; \
	"$(K3D)" cluster delete -a || true; \
	rm -f "$$TOKEN_PATH"

.PHONY: check
check:
	-@/usr/bin/env sh -c ' \
	  echo ""; \
	  echo "🔍 Checking required tools..."; \
	  echo ""; \
	  missing=0; \
	  for tool in $(TOOLS); do \
	    if command -v "$$tool" >/dev/null 2>&1; then \
	      ver="`$$tool --version 2>/dev/null | head -n1`"; \
	      [ -z "$$ver" ] && ver="installed"; \
	      printf "  ✅ %-10s %s\n" "$$tool" "$$ver"; \
	    else \
	      printf "  ❌ %-10s not found in PATH\n" "$$tool"; \
	      missing=1; \
	    fi; \
	  done; \
	  echo ""; \
	  if [ "$$missing" -ne 0 ]; then \
	    echo "One or more required tools are missing."; \
	  else \
	    echo "All required tools are installed and available."; \
	  fi; \
	  echo ""; \
	  if [ -z "$${GITHUB_PAT:-}" ]; then \
	    echo "⚠️  GITHUB_PAT not set"; \
	  else \
	    echo "✅ GITHUB_PAT is set"; \
	  fi; \
	  echo ""; \
	  echo "Env vars:"; \
	  echo "  SKAFFOLD_ENV_FILE=$(SKAFFOLD_ENV_FILE)"; \
	  echo "  GITHUB_USER=$(GITHUB_USER)"; \
	  echo ""; \
	  exit 0 \
	'
