import { nearbyPrices, SERVICES } from "@betterbill/core";
import { z } from "zod";

import { PRICE_CAPTURES } from "../data";
import { publicProcedure } from "../index";
import { EmptyInput, NearbyPricesInput } from "../inputs";
import { NearbyPrice, PriceService } from "../outputs";

export const priceRouter = {
  // The services the "Before you go" tab compares, with plain names.
  services: publicProcedure
    .input(EmptyInput)
    .output(z.array(PriceService))
    .handler(() => [...SERVICES]),

  // Hospitals' published cash prices for one service, lowest first, with the
  // distance from the patient and the price file each price came from.
  nearby: publicProcedure
    .input(NearbyPricesInput)
    .output(z.array(NearbyPrice))
    .handler(({ input }) =>
      nearbyPrices({
        captures: PRICE_CAPTURES,
        code: input.code,
        origin: { lat: input.lat, lng: input.lng },
      }),
    ),
};
