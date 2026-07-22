import { useState } from "react";
import { Loader2, MapPin, CheckCircle2, RotateCcw } from "lucide-react";
import {
  geocodeAddress,
  osmEmbedUrl,
  type AddressGeocodeHit,
} from "@/lib/addressGeocode";

type Props = {
  address: string;
  city: string;
  province: string;
  onConfirm: (hit: AddressGeocodeHit) => void;
  onEdit: () => void;
  confirmed: AddressGeocodeHit | null;
};

const AddressPreview = ({
  address,
  city,
  province,
  onConfirm,
  onEdit,
  confirmed,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hit, setHit] = useState<AddressGeocodeHit | null>(confirmed);

  const runLookup = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = `${address}, ${city}, ${province}, Canada`;
      const res = await geocodeAddress(q);
      if (!res) {
        setError(
          "We couldn't find that address on the map. Double-check the number and street, or continue anyway — we'll verify manually.",
        );
        setHit(null);
      } else {
        setHit(res);
      }
    } catch (e) {
      setError(
        "Map lookup is temporarily unavailable. You can still submit — we'll confirm the address manually.",
      );
      setHit(null);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-start gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-heading font-bold text-foreground">
              Address confirmed
            </p>
            <p className="text-sm text-muted-foreground">
              {confirmed.formatted}
            </p>
          </div>
        </div>
        <div className="relative rounded-lg overflow-hidden border border-border">
          <iframe
            title="Confirmed address map"
            src={osmEmbedUrl(confirmed.lat, confirmed.lon)}
            loading="lazy"
            className="w-full h-[220px] block"
          />
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Change address
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-bold text-foreground">
            Verify address on the map
          </p>
          <p className="text-sm text-muted-foreground">
            We'll match your entry to a map pin so the {city} crew heads to
            the right spot.
          </p>
        </div>
      </div>

      {hit && (
        <>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Best match
            </p>
            <p className="font-semibold text-foreground">{hit.formatted}</p>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-border">
            <iframe
              title="Address preview map"
              src={osmEmbedUrl(hit.lat, hit.lon)}
              loading="lazy"
              className="w-full h-[220px] block"
            />
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runLookup}
          disabled={loading || !address || address.length < 3}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground font-semibold px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Looking up…
            </>
          ) : hit ? (
            <>
              <RotateCcw className="w-4 h-4" /> Re-check
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" /> Preview on map
            </>
          )}
        </button>
        {hit && (
          <button
            type="button"
            onClick={() => onConfirm(hit)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-heading font-bold px-4 py-2 text-sm hover:opacity-90"
          >
            <CheckCircle2 className="w-4 h-4" /> This is the right spot
          </button>
        )}
      </div>
    </div>
  );
};

export default AddressPreview;
