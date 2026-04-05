/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { WEBSITE_URL } from "@plane/constants";
// assets
import { PlaneLogo } from "@plane/propel/icons";

type TPoweredBy = {
  disabled?: boolean;
};

export function PoweredBy(props: TPoweredBy) {
  // Disabled for Edelweiss self-hosted deployment
  return null;
}
