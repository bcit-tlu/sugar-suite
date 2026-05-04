{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [
    git
    kubectx
    kubectl
    kustomize
    pkgs.nodejs_24
    kubernetes-helm
    jq
    vault
  ];
  shellHook = ''
  '';
}
