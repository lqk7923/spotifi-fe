# Spotifi Keycloak theme

Build from the repository root, using the exact Keycloak image tag deployed on
your server. The version is required; there is no implicit upgrade to `latest`.

```powershell
$env:KEYCLOAK_VERSION = '<deployed-keycloak-tag>'
docker build --build-arg "KEYCLOAK_VERSION=$env:KEYCLOAK_VERSION" -t spotifi-keycloak:theme ./keycloak-theme
```

The image copies `themes/spotifi` into `/opt/keycloak/themes/spotifi`, following
[Keycloak's theme directory layout](https://www.keycloak.org/ui-customization/themes).
It includes the login and registration styles, scripts, images, and translations.
The standalone HTML preview and sample realm are excluded from the image.

## Existing deployment

Use `spotifi-keycloak:theme` in place of your existing Keycloak image, keeping
your database, environment variables, secrets, volumes, ports, and startup
arguments. The image defaults to `start`; it does not import a realm or create
an administrator.

This image does not run `kc.sh build` ahead of time, so use `start` rather than
`start --optimized`. Keycloak applies build options such as the database vendor
at startup; see [Keycloak's standard container instructions](https://www.keycloak.org/server/containers#_running_a_standard_keycloak_container).

In the Admin Console, select your application realm, then set
**Realm settings > Themes > Login theme** to **spotifi** and save.
Enable **Realm settings > Login > User registration** if sign-up is needed.
Google login requires a Google identity provider configured in that realm.

## Local preview

With `KEYCLOAK_VERSION` set as above, run from the repository root:

```powershell
docker compose -f keycloak-theme/compose.preview.yaml up --build
```

The preview runs at <http://localhost:8180> in development mode with theme caching
disabled. It imports only the separate `spotifi-theme-preview` realm; its public
client is `spotifi-web-theme-preview`, configured for <http://localhost:5173>.

To open its login page directly, visit
[the preview realm's Account Console](http://localhost:8180/realms/spotifi-theme-preview/account/).
Rebuild the image after editing theme files. The preview realm uses a temporary
local database; removing the container removes its data.

Stop the preview with:

```powershell
docker compose -f keycloak-theme/compose.preview.yaml down
```
