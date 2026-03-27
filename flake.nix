{
  description = "GNOME Translator Shell Extension Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          coreutils
          curl
          glib
          gjs
          gtk4
          libadwaita
          gobject-introspection
          pkg-config
          graphene
          gnome-shell
        ];

        shellHook = ''
          export GI_TYPELIB_PATH="${pkgs.libadwaita.out}/lib/girepository-1.0:${pkgs.gtk4.out}/lib/girepository-1.0:${pkgs.pango.out}/lib/girepository-1.0:${pkgs.harfbuzz.out}/lib/girepository-1.0:${pkgs.gdk-pixbuf.out}/lib/girepository-1.0:${pkgs.glib.out}/lib/girepository-1.0:${pkgs.graphene.out}/lib/girepository-1.0:${pkgs.gobject-introspection.out}/lib/girepository-1.0"
          export XDG_DATA_DIRS="${pkgs.gtk4.out}/share:''${XDG_DATA_DIRS:-}"

          EXTENSION_UUID="gnome-translator@camalouu"
          echo "GNOME Translator development shell ready."
          echo "Package: gnome-extensions pack -f -o .dist \"$PWD\""
          echo "Install: gnome-extensions install -f .dist/$EXTENSION_UUID.shell-extension.zip"
          echo "Enable:  gnome-extensions enable $EXTENSION_UUID"
        '';
      };
    };
}
