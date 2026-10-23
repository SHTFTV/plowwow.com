import { useParams } from "react-router-dom";
import { getCityBySlug } from "@/data/cities";
import Quote from "./Quote";
import NotFound from "./NotFound";

export default function CityQuote() {
 const { citySlug = "" } = useParams<{ citySlug: string }>();
 const slug = citySlug.replace(/\/+$/, "");
 const city = getCityBySlug(slug);
 const name = slug === "burnaby" ? "Burnaby" : city?.name;
 return name ? <Quote cityName={name} citySlug={slug}/> : <NotFound/>;
}
