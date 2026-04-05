/**
 * Edelweiss OIDC admin toggle — mirrors GiteaConfiguration.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { getButtonStyling } from "@plane/propel/button";
import type { TInstanceAuthenticationMethodKeys } from "@plane/types";
import { ToggleSwitch } from "@plane/ui";
import { cn } from "@plane/utils";
import { useInstance } from "@/hooks/store";

type Props = {
  disabled: boolean;
  updateConfig: (key: TInstanceAuthenticationMethodKeys, value: string) => void;
};

export const OIDCConfiguration = observer(function OIDCConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  const { formattedConfig } = useInstance();
  const oidcEnabled = formattedConfig?.IS_OIDC_ENABLED ?? "";
  const oidcConfigured =
    !!formattedConfig?.OIDC_HOST && !!formattedConfig?.OIDC_CLIENT_ID && !!formattedConfig?.OIDC_CLIENT_SECRET;

  return (
    <>
      {oidcConfigured ? (
        <div className="flex items-center gap-4">
          <Link href="/authentication/oidc" className={cn(getButtonStyling("link", "base"), "font-medium")}>
            Edit
          </Link>
          <ToggleSwitch
            value={Boolean(parseInt(oidcEnabled))}
            onChange={() => {
              Boolean(parseInt(oidcEnabled))
                ? updateConfig("IS_OIDC_ENABLED", "0")
                : updateConfig("IS_OIDC_ENABLED", "1");
            }}
            size="sm"
            disabled={disabled}
          />
        </div>
      ) : (
        <Link href="/authentication/oidc" className={cn(getButtonStyling("secondary", "base"), "text-tertiary")}>
          <Settings2 className="h-4 w-4 p-0.5 text-tertiary" />
          Configure
        </Link>
      )}
    </>
  );
});
