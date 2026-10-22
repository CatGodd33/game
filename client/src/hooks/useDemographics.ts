import { useEffect, useState } from "react";
import type { DemographicsMeta } from "@life-duel/shared";
import { api } from "../services/api";

let cache: DemographicsMeta | null = null;
let pending: Promise<DemographicsMeta> | null = null;

function load(): Promise<DemographicsMeta> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api
      .demographics()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useDemographics() {
  const [data, setData] = useState<DemographicsMeta | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    setLoading(!cache);
    load()
      .then((meta) => {
        if (!active) return;
        setData(meta);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos demográficos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const countryName = (code: string): string =>
    data?.countries.find((country) => country.code === code)?.name ?? code;

  return { data, error, loading, countryName };
}
