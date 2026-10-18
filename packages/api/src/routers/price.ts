import { nearbyPrices, SERVICES, summarizeNearby } from "@betterbill/core";
import { z } from "zod";

import { PRICE_CAPTURES } from "../data";
import { publicProcedure } from "../index";
import { EmptyInput, NearbyPricesInput } from "../inputs";
import { NearbyPrices, PriceService } from "../outputs";

export const priceRouter = {
  // The services the "Before you go" tab compares, with plain names.
  services: publicProcedure
    .input(EmptyInput)
    .output(z.array(PriceService))
    .handler(() => SERVICES.map((s) => ({ ...s, terms: [...s.terms] }))),

  // Hospitals' published cash prices for one service, lowest first, with the
  // distance from the patient and the price file each price came from, plus
  // the lowest, middle and highest of them.
  nearby: publicProcedure
    .input(NearbyPricesInput)
    .output(NearbyPrices)
    .handler(({ input }) => {
      const rows = nearbyPrices({
        captures: PRICE_CAPTURES,
        code: input.code,
        origin: { lat: input.lat, lng: input.lng },
      });
      return { rows, summary: summarizeNearby(rows) };
    }),
};
