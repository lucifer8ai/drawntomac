import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LocationOption {
  id: string;
  country: string;
  city: string | null;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (locationId: string | null) => void;
}) {
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    supabase
      .from("locations")
      .select("country")
      .is("city", null)
      .order("country")
      .then(({ data }) => {
        if (data) setCountries([...new Set(data.map((d) => d.country))]);
      });
  }, []);

  useEffect(() => {
    if (!value || initialized.current) return;
    initialized.current = true;
    supabase
      .from("locations")
      .select("country")
      .eq("id", value)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSelectedCountry(data.country);
      });
  }, [value]);

  useEffect(() => {
    if (!selectedCountry) {
      setCities([]);
      return;
    }
    setLoading(true);
    supabase
      .from("locations")
      .select("*")
      .eq("country", selectedCountry)
      .order("city", { ascending: true })
      .then(({ data }) => {
        setCities(data ?? []);
        setLoading(false);
      });
  }, [selectedCountry]);

  function handleCountryChange(country: string) {
    setSelectedCountry(country);
    supabase
      .from("locations")
      .select("id")
      .eq("country", country)
      .is("city", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data) onChange(data.id);
      });
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Location</Label>
      <Select value={selectedCountry} onValueChange={handleCountryChange}>
        <SelectTrigger className="h-11 rounded-lg">
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          {countries.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {cities.filter((c) => c.city !== null).length > 0 && (
        <Select
          value={value ?? ""}
          onValueChange={(v) => onChange(v || null)}
          disabled={loading}
        >
          <SelectTrigger className="h-11 rounded-lg">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {cities
              .filter((c) => c.city !== null)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.city}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
