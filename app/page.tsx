/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef } from "react";
import { WIDTH_BREAKPOINTS, WidthBreakpoint } from "@/lib/width";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { snapdom } from "@zumer/snapdom";

type LoadingStep = "idle" | "loading-url" | "loading-HTML" | "generating";

const initialStateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>s8t - Ready to Capture</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        p {
            font-size: 1.5rem;
            margin: 0 0 1rem 0;
            opacity: 0.9;
            line-height: 1.5;
        }
        .cta {
            font-size: 1.125rem;
            opacity: 0.8;
            display: inline-block;
            text-align: left;
        }
        .cta li {
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Capture website screenshots</p>
        <ol class="cta">
            <li>Enter your URL</li>
            <li>Click &quot;Render&quot;</li>
            <li>Screenshot is ready</li>
        </ol>
    </div>
</body>
</html>
`;

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");

  const [url, setUrl] = useState("https://www.apple.com/");
  const [lastProcessedUrl, setLastProcessedUrl] = useState<string>("");
  const [width, setWidth] = useState<WidthBreakpoint>(1280);
  const [imageFormat, setImageFormat] = useState<"png" | "jpg" | "webp">("jpg");

  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const contentRef = useRef<HTMLIFrameElement>(null);

  const processHtml = (html: string, baseUrl: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const base = new URL(baseUrl);

      const baseTag = doc.createElement("base");
      baseTag.href = base.origin;
      doc.head.insertBefore(baseTag, doc.head.firstChild);

      const processRelativeUrl = (element: Element, attribute: string) => {
        const value = element.getAttribute(attribute);
        if (value && !value.startsWith("http")) {
          if (value.startsWith("/")) {
            element.setAttribute(attribute, `${base.origin}${value}`);
          } else {
            element.setAttribute(attribute, `${base.origin}/${value}`);
          }
        }
      };

      doc.querySelectorAll("script").forEach((script) => {
        script.remove();
      });

      doc.querySelectorAll("meta").forEach((meta) => {
        meta.remove();
      });

      doc.querySelectorAll("link").forEach((link) => {
        if (link.getAttribute("rel") === "stylesheet") {
          processRelativeUrl(link, "href");
        } else {
          link.remove();
        }
      });

      doc.querySelectorAll("a").forEach((anchor) => {
        anchor.removeAttribute("href");
      });

      doc.documentElement.style.overflowY = "hidden";

      return doc.documentElement.outerHTML;
    } catch (err) {
      console.error("Error processing HTML:", err);
      return html;
    }
  };

  const fetchWebsite = async (targetUrl: string): Promise<string> => {
    const response = await fetch(`https://proxy.corsfix.com/?${targetUrl}`, {
      headers: {
        "x-corsfix-cache": "true",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to load website: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    return processHtml(html, targetUrl);
  };

  const loadIframe = async (processedHtml: string): Promise<HTMLElement> => {
    if (!contentRef.current) {
      throw new Error("Iframe not available");
    }

    const iframe = contentRef.current;

    return new Promise((resolve, reject) => {
      iframe.onload = () => {
        // Configure iframe dimensions
        iframe.width = width.toString();

        // hack for scaling to full width
        const scale = window.innerWidth / iframe.offsetWidth;
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        iframe.style.marginBottom = `calc(${scale} - 1) * 100%)`;

        // make height follow the whole html
        iframe.height = window.innerHeight.toString();
        if (iframe.contentWindow?.document.body) {
          const contentHeight = iframe.contentWindow.document.body.scrollHeight;
          iframe.height = contentHeight.toString();
        }

        const element = iframe.contentDocument?.documentElement;
        if (!element) {
          reject(new Error("Could not access iframe content"));
          return;
        }

        resolve(element);
      };

      iframe.srcdoc = processedHtml;
    });
  };

  const generateImage = async (element: HTMLElement) => {
    const blob = await snapdom.toBlob(element, {
      useProxy: "https://proxy.corsfix.com/?url=",
      backgroundColor: "#fff",
      embedFonts: true,
      compress: true,
      fast: true,
      quality: 0.7,
      type: imageFormat,
    });

    return URL.createObjectURL(blob);
  };

  const openInNewTab = () => {
    if (imageUrl) {
      window.open(imageUrl, "_blank");
    }
  };

  const downloadImage = () => {
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `screenshot-${Date.now()}.${imageFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const render = async () => {
    if (!url.trim()) return;
    setError(null);
    // Clear previous result
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);

    try {
      let processedHtml: string;

      if (url !== lastProcessedUrl) {
        // Step 1: Fetch website
        setLoadingStep("loading-url");
        processedHtml = await fetchWebsite(url);
        setLastProcessedUrl(url);
      } else {
        // Use cached HTML - we need to get it from the current iframe
        if (!contentRef.current?.srcdoc) {
          throw new Error("No cached content available");
        }
        processedHtml = contentRef.current.srcdoc;
      }

      // Step 2: Load into iframe (always needed for width/format changes)
      setLoadingStep("loading-HTML");
      const element = await loadIframe(processedHtml);

      // Step 3: Generate image
      setLoadingStep("generating");
      const newImageUrl = await generateImage(element);

      setImageUrl(newImageUrl);
      setLoadingStep("idle");
    } catch (error) {
      console.error("Render error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to process screenshot. Please try again."
      );
      setLoadingStep("idle");
    }
  };

  return (
    <>
      <div className="h-0">
        <iframe
          ref={contentRef}
          className="min-h-screen"
          sandbox="allow-same-origin"
          srcDoc={initialStateHtml}
          width="100%"
        />
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg hover:bg-white transition-colors"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-full md:max-w-lg bg-white/95 backdrop-blur-sm border-r shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <header className="text-center mb-8 pt-8">
              <h1 className="text-4xl font-bold mb-4">s8t</h1>
              <p className="text-xl text-muted-foreground">
                Capture website screenshots with ease
              </p>
            </header>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Width</Label>
                <Select
                  defaultValue={width.toString()}
                  onValueChange={(value) =>
                    setWidth(Number(value) as WidthBreakpoint)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDTH_BREAKPOINTS.map((bp) => (
                      <SelectItem key={bp} value={bp.toString()}>
                        {bp}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Image format</Label>
                <Select
                  defaultValue="jpg"
                  onValueChange={(value: "png" | "jpg" | "webp") =>
                    setImageFormat(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <Button
                type="button"
                onClick={render}
                className="w-full"
                disabled={loadingStep !== "idle"}
              >
                {loadingStep === "loading-url" && "Fetching URL..."}
                {loadingStep === "loading-HTML" && "Loading HTML..."}
                {loadingStep === "generating" && "Generating image..."}
                {loadingStep === "idle" && "Render"}
              </Button>

              {error && (
                <div className="flex items-center gap-2 border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="bg-red-100 rounded-full p-1">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium text-red-800">{error}</span>
                </div>
              )}

              {imageUrl && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium mb-3">Generated Screenshot</h3>
                    <div className="flex justify-center mb-4">
                      <img
                        src={imageUrl}
                        alt="Generated screenshot"
                        className="max-w-full max-h-96 rounded border shadow-sm"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={openInNewTab}
                        variant="outline"
                        size="sm"
                      >
                        Open in New Tab
                      </Button>
                      <Button onClick={downloadImage} size="sm">
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-12 py-6 border-t text-center text-sm text-muted-foreground">
              powered by{" "}
              <a
                href="https://github.com/zumerlab/snapdom"
                className="font-medium hover:underline"
              >
                snapdom
              </a>{" "}
              •{" "}
              <a
                href="https://corsfix.com"
                className="font-medium hover:underline"
              >
                cors proxy by corsfix
              </a>{" "}
              •{" "}
              <a
                href="https://github.com/reynaldichernando/s8t"
                className="font-medium hover:underline"
              >
                source code
              </a>
            </footer>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 h-full w-full bg-black/20 z-30 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  );
}
