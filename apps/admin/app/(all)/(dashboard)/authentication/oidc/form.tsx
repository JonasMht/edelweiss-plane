/**
 * Edelweiss OIDC configuration form for god-mode.
 */

import { useState } from "react";
import { isEmpty } from "lodash-es";
import Link from "next/link";
import { useForm } from "react-hook-form";
// plane internal packages
import { API_BASE_URL } from "@plane/constants";
import { Button, getButtonStyling } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IFormattedInstanceConfiguration, TInstanceOidcAuthenticationConfigurationKeys } from "@plane/types";
// components
import { CodeBlock } from "@/components/common/code-block";
import { ConfirmDiscardModal } from "@/components/common/confirm-discard-modal";
import type { TControllerInputFormField } from "@/components/common/controller-input";
import { ControllerInput } from "@/components/common/controller-input";
import type { TControllerSwitchFormField } from "@/components/common/controller-switch";
import { ControllerSwitch } from "@/components/common/controller-switch";
import type { TCopyField } from "@/components/common/copy-field";
import { CopyField } from "@/components/common/copy-field";
// hooks
import { useInstance } from "@/hooks/store";

type Props = {
  config: IFormattedInstanceConfiguration;
};

type OidcConfigFormValues = Record<TInstanceOidcAuthenticationConfigurationKeys, string>;

export function InstanceOidcConfigForm(props: Props) {
  const { config } = props;
  // states
  const [isDiscardChangesModalOpen, setIsDiscardChangesModalOpen] = useState(false);
  // store hooks
  const { updateInstanceConfigurations } = useInstance();
  // form data
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<OidcConfigFormValues>({
    defaultValues: {
      OIDC_HOST: config["OIDC_HOST"] || "",
      OIDC_CLIENT_ID: config["OIDC_CLIENT_ID"] || "",
      OIDC_CLIENT_SECRET: config["OIDC_CLIENT_SECRET"] || "",
      ENABLE_OIDC_SYNC: config["ENABLE_OIDC_SYNC"] || "1",
    },
  });

  const originURL = !isEmpty(API_BASE_URL) ? API_BASE_URL : typeof window !== "undefined" ? window.location.origin : "";

  const OIDC_FORM_FIELDS: TControllerInputFormField[] = [
    {
      key: "OIDC_HOST",
      type: "text",
      label: "OIDC Issuer URL",
      description: (
        <>The base URL of your OpenID Connect provider (e.g. your Edelweiss instance URL). Must serve a <CodeBlock darkerShade>.well-known/openid-configuration</CodeBlock> endpoint.</>
      ),
      placeholder: "https://edelweissai.org",
      error: Boolean(errors.OIDC_HOST),
      required: true,
    },
    {
      key: "OIDC_CLIENT_ID",
      type: "text",
      label: "Client ID",
      description: (
        <>The OIDC client ID registered with your identity provider for this Plane instance.</>
      ),
      placeholder: "plane",
      error: Boolean(errors.OIDC_CLIENT_ID),
      required: true,
    },
    {
      key: "OIDC_CLIENT_SECRET",
      type: "password",
      label: "Client secret",
      description: (
        <>The OIDC client secret associated with the client ID above.</>
      ),
      placeholder: "your-oidc-client-secret",
      error: Boolean(errors.OIDC_CLIENT_SECRET),
      required: true,
    },
  ];

  const OIDC_FORM_SWITCH_FIELD: TControllerSwitchFormField<OidcConfigFormValues> = {
    name: "ENABLE_OIDC_SYNC",
    label: "Edelweiss SSO",
  };

  const OIDC_SERVICE_FIELD: TCopyField[] = [
    {
      key: "Callback_URI",
      label: "Callback URI",
      url: `${originURL}/auth/oidc/callback/`,
      description: (
        <>
          Register this as the redirect URI in your OIDC provider&apos;s client configuration.
        </>
      ),
    },
  ];

  const onSubmit = async (formData: OidcConfigFormValues) => {
    const payload: Partial<OidcConfigFormValues> = { ...formData };

    try {
      const response = await updateInstanceConfigurations(payload);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Done!",
        message: "Your Edelweiss SSO is configured. You should test it now.",
      });
      reset({
        OIDC_HOST: response.find((item) => item.key === "OIDC_HOST")?.value,
        OIDC_CLIENT_ID: response.find((item) => item.key === "OIDC_CLIENT_ID")?.value,
        OIDC_CLIENT_SECRET: response.find((item) => item.key === "OIDC_CLIENT_SECRET")?.value,
        ENABLE_OIDC_SYNC: response.find((item) => item.key === "ENABLE_OIDC_SYNC")?.value,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoBack = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (isDirty) {
      e.preventDefault();
      setIsDiscardChangesModalOpen(true);
    }
  };

  return (
    <>
      <ConfirmDiscardModal
        isOpen={isDiscardChangesModalOpen}
        onDiscardHref="/authentication"
        handleClose={() => setIsDiscardChangesModalOpen(false)}
      />
      <div className="flex flex-col gap-8">
        <div className="grid w-full grid-cols-2 gap-x-12 gap-y-8">
          <div className="col-span-2 flex flex-col gap-y-4 pt-1 md:col-span-1">
            {OIDC_FORM_FIELDS.map((field) => (
              <ControllerInput
                key={field.key}
                control={control}
                type={field.type}
                name={field.key as TInstanceOidcAuthenticationConfigurationKeys}
                label={field.label}
                description={field.description}
                placeholder={field.placeholder}
                error={field.error}
                required={field.required}
              />
            ))}
            <ControllerSwitch
              control={control}
              name={OIDC_FORM_SWITCH_FIELD.name}
              label={OIDC_FORM_SWITCH_FIELD.label}
            />
            <div className="flex flex-col gap-1 pt-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/authentication"
                  className={getButtonStyling("link-neutral", "base")}
                  onClick={handleGoBack}
                >
                  Go back
                </Link>
                <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!isDirty}>
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-y-4 pt-1 md:col-span-1">
            {OIDC_SERVICE_FIELD.map((field) => (
              <CopyField key={field.key} label={field.label} url={field.url} description={field.description} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
