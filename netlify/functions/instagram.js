// Henter de 6 siste innleggene fra Instagram («Instagram API with Instagram Login»).
// Nøkkelen ligger i miljøvariabelen INSTAGRAM_TOKEN i Netlify, aldri i repoet.
// Langtidsnøkkelen varer ca. 60 dager. Forny den før den går ut:
//   https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<nøkkel>
// Uten nøkkel, eller hvis kallet feiler, returneres content/instagram-reserve.json
// (siste kjente svar). Er den tom, skjules seksjonen på siden.
import reserve from "../../content/instagram-reserve.json" with { type: "json" };

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

const json = (body, maxAge) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });

export default async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return json(reserve, 3600);
  try {
    const url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=6&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Instagram svarte ${res.status}`);
    const { data = [] } = await res.json();
    const posts = data.slice(0, 6).map((p) => ({
      id: p.id,
      mediaUrl: p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url,
      permalink: p.permalink,
      caption: p.caption || "",
      timestamp: p.timestamp,
    }));
    return json(posts, 3600);
  } catch (err) {
    console.error(err);
    return json(reserve, 300);
  }
};
