# Pass the exact Keycloak tag used by the deployment via --build-arg.
ARG KEYCLOAK_VERSION
FROM quay.io/keycloak/keycloak:26.8.1

# This theme uses upstream templates and needs no Node or Java build step.
COPY --chown=1000:0 themes/spotifi/ /opt/keycloak/themes/spotifi/

USER 1000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start"]
