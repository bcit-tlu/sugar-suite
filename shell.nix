{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    kubectl
    kubernetes-helm
    fluxcd
    gh
    kubectx
    kustomize
    oras
    git
    jq
    vault
    nodejs_24
  ];
  shellHook = ''
  '';
}
