import { polarClient } from "@polar-sh/better-auth/client";
import { anonymousClient, phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [polarClient(), anonymousClient(), phoneNumberClient()],
});
