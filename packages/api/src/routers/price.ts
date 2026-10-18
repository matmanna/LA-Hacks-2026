import {
  hospitalDetail,
  labPrices,
  nearbyHospitals,
  nearbyPrices,
  SERVICES,
  summarizeNearby,
} from "@betterbill/core";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { LAB_CAPTURES, PRICE_CAPTURES } from "../data";
import { publicProcedure } from "../index";
import {
  EmptyInput,
  HospitalPricesInput,
  LabPricesInput,
  NearbyPricesInput,
  OriginInput,
} from "../inputs";
import {
  HospitalDetail,
  HospitalSummary,
  LabPrice,
  NearbyPrices,
  PriceService,
} from "../outputs";

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

  // Every captured hospital near the patient, nearest first, with how many
  // services it prices and on how many its price is the lowest nearby.
  hospitals: publicProcedure
    .input(OriginInput)
    .output(z.array(HospitalSummary))
    .handler(({ input }) =>
      nearbyHospitals({ captures: PRICE_CAPTURES, origin: input }),
    ),

  // One hospital's published cash price for every service, with its rank
  // among the hospitals near the patient.
  hospital: publicProcedure
    .input(HospitalPricesInput)
    .output(HospitalDetail)
    .handler(({ input }) => {
      const detail = hospitalDetail({
        captures: PRICE_CAPTURES,
        hospitalKey: input.hospitalKey,
        origin: { lat: input.lat, lng: input.lng },
      });
      if (!detail) {
        throw new ORPCError("NOT_FOUND", {
          message: "We have no price file for this hospital.",
        });
      }
      return detail;
    }),

  // Labs' own online prices for a service (ordered online, drawn at the
  // lab), lowest first. A separate source, never ranked with hospitals.
  labs: publicProcedure
    .input(LabPricesInput)
    .output(z.array(LabPrice))
    .handler(({ input }) =>
      labPrices({ labs: LAB_CAPTURES, code: input.code }),
    ),
};
