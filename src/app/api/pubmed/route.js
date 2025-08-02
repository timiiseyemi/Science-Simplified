// app/api/pubmed/route.js
import { NextResponse } from "next/server";
import xml2js from "xml2js";

export async function POST(req) {
    try {
        const { url } = await req.json();
        if (!url || !url.includes("pubmed")) {
            return NextResponse.json({ error: "Invalid PubMed/PubMed Central URL" }, { status: 400 });
        }

        // Extract numeric ID (works for pubmed.ncbi.nlm.nih.gov or ncbi.nlm.nih.gov/pmc)
        const idMatch = url.match(/(\d+)/);
        if (!idMatch) {
            return NextResponse.json({ error: "Could not extract ID" }, { status: 400 });
        }
        const id = idMatch[1];

        // Use PubMed E-utilities
        const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}&retmode=xml`;
        const response = await fetch(efetchUrl);
        const xml = await response.text();

        const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
        const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        // Extract fields
        const title = article.ArticleTitle || "";
        const abstract = Array.isArray(article.Abstract?.AbstractText)
            ? article.Abstract.AbstractText.map(obj => obj._ || obj).join("\n\n")
            : (article.Abstract?.AbstractText?._ || article.Abstract?.AbstractText || "");

        const authors = (article.AuthorList?.Author || []).map(a => {
            const first = a.ForeName || "";
            const last = a.LastName || "";
            return `${first} ${last}`.trim();
        });

        const pubDate = article.Journal?.JournalIssue?.PubDate || {};
        const date = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join(" ");

        // Get DOI
        const ids = parsed?.PubmedArticleSet?.PubmedArticle?.PubmedData?.ArticleIdList?.ArticleId || [];
        const doi = Array.isArray(ids)
            ? ids.find(i => i.$?.IdType === "doi")?._ 
            : ids._;

        return NextResponse.json({
            title,
            authors,
            publicationDate: date,
            doi,
            sourceLink: doi ? `https://doi.org/${doi}` : url,
            abstract
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch PubMed data" }, { status: 500 });
    }
}

