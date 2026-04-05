# Edelweiss OIDC provider for Plane (community edition).
# Integrates with the Edelweiss unified auth system via standard OpenID Connect.

import os
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse

import pytz
import requests

from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)
from plane.authentication.adapter.oauth import OauthAdapter
from plane.license.utils.instance_value import get_configuration_value


class OIDCOAuthProvider(OauthAdapter):
    provider = "oidc"
    scope = "openid email profile"

    def __init__(self, request, code=None, state=None, callback=None):
        (OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_HOST) = get_configuration_value(
            [
                {
                    "key": "OIDC_CLIENT_ID",
                    "default": os.environ.get("OIDC_CLIENT_ID"),
                },
                {
                    "key": "OIDC_CLIENT_SECRET",
                    "default": os.environ.get("OIDC_CLIENT_SECRET"),
                },
                {
                    "key": "OIDC_HOST",
                    "default": os.environ.get("OIDC_HOST"),
                },
            ]
        )

        if not (OIDC_CLIENT_ID and OIDC_CLIENT_SECRET and OIDC_HOST):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )

        parsed = urlparse(OIDC_HOST)
        if not parsed.scheme or parsed.scheme not in ("https", "http"):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_NOT_CONFIGURED"],
                error_message="OIDC_NOT_CONFIGURED",
            )
        OIDC_HOST = OIDC_HOST.rstrip("/")

        # Discover endpoints from .well-known or fall back to Edelweiss defaults.
        discovery = self._discover(OIDC_HOST)

        self.token_url = discovery.get(
            "token_endpoint",
            f"{OIDC_HOST}/protocol/openid-connect/token",
        )
        self.userinfo_url = discovery.get(
            "userinfo_endpoint",
            f"{OIDC_HOST}/protocol/openid-connect/userinfo",
        )
        authorize_url = discovery.get(
            "authorization_endpoint",
            f"{OIDC_HOST}/protocol/openid-connect/auth",
        )

        client_id = OIDC_CLIENT_ID
        client_secret = OIDC_CLIENT_SECRET

        redirect_uri = (
            f"{'https' if request.is_secure() else 'http'}"
            f"://{request.get_host()}/auth/oidc/callback/"
        )
        url_params = {
            "client_id": client_id,
            "scope": self.scope,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }
        auth_url = f"{authorize_url}?{urlencode(url_params)}"

        super().__init__(
            request,
            self.provider,
            client_id,
            self.scope,
            redirect_uri,
            auth_url,
            self.token_url,
            self.userinfo_url,
            client_secret,
            code,
            callback=callback,
        )

    @staticmethod
    def _discover(host: str) -> dict:
        """Fetch OIDC discovery document, return empty dict on failure."""
        try:
            resp = requests.get(
                f"{host}/.well-known/openid-configuration",
                timeout=5,
            )
            if resp.ok:
                return resp.json()
        except requests.RequestException:
            pass
        return {}

    def set_token_data(self):
        data = {
            "code": self.code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        headers = {"Accept": "application/json"}
        token_response = self.get_user_token(data=data, headers=headers)
        super().set_token_data(
            {
                "access_token": token_response.get("access_token"),
                "refresh_token": token_response.get("refresh_token"),
                "access_token_expired_at": (
                    datetime.now(tz=pytz.utc)
                    + timedelta(seconds=token_response.get("expires_in"))
                    if token_response.get("expires_in")
                    else None
                ),
                "refresh_token_expired_at": None,
                "id_token": token_response.get("id_token", ""),
            }
        )

    def set_user_data(self):
        user_info_response = self.get_user_response()
        email = user_info_response.get("email")
        if not email:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OIDC_OAUTH_PROVIDER_ERROR"],
                error_message="OIDC_OAUTH_PROVIDER_ERROR",
            )

        # Standard OIDC claims
        first_name = (
            user_info_response.get("given_name")
            or user_info_response.get("name")
            or user_info_response.get("preferred_username")
            or email.split("@")[0]
        )
        last_name = user_info_response.get("family_name") or ""

        super().set_user_data(
            {
                "email": email,
                "user": {
                    "provider_id": str(
                        user_info_response.get("sub")
                        or user_info_response.get("id")
                    ),
                    "email": email,
                    "avatar": user_info_response.get("picture") or "",
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_password_autoset": True,
                },
            }
        )
