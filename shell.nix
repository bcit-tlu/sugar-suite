{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [
    pkgs.python315
    # pkgs.python311Packages.pip  # REMOVE THIS LINE!
  ];
  shellHook = ''
    python -m venv .venv
    source .venv/bin/activate
    pip install zensical
  '';
}
