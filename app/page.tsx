"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WIDTH_BREAKPOINTS, WidthBreakpoint } from "@/lib/width";
import { Check, Menu, X } from "lucide-react";
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

export default function Home() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [url, setUrl] = useState("https://www.apple.com/");
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLIFrameElement>(null);
  const [imageFormat, setImageFormat] = useState<"png" | "jpg" | "webp">("png");
  const [imageQuality, setImageQuality] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [width, setWidth] = useState<WidthBreakpoint>(1280);

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

  const fetchAndRenderWebsite = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
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
      const processedHtml = processHtml(html, targetUrl);

      if (contentRef.current) {
        contentRef.current.srcdoc = processedHtml;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load the website. Please check the URL and try again."
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndRenderWebsite(url);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    await fetchAndRenderWebsite(url);
  };

  const handleIframeLoad = async () => {
    if (!contentRef.current || !contentRef.current.srcdoc) return;

    try {
      const iframe = contentRef.current;

      iframe.width = width.toString();
      const scale = window.innerWidth / iframe.offsetWidth;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = "top left";
      iframe.style.marginBottom = `calc(${scale} - 1) * 100%)`;

      iframe.height = window.innerHeight.toString();
      if (iframe.contentWindow?.document.body) {
        const contentHeight = iframe.contentWindow.document.body.scrollHeight;
        iframe.height = contentHeight + "px";
      }

      // Just mark as successfully loaded, but don't capture yet
      setSuccess(true);
    } catch (error) {
      console.error("Iframe load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contentRef.current) return;

    setDownloadLoading(true);

    try {
      const iframe = contentRef.current;
      const element = iframe.contentDocument?.documentElement;

      if (!element) {
        throw new Error("Could not access iframe content");
      }

      // Convert quality setting to numeric value
      const qualityValue =
        imageQuality === "low" ? 0.3 : imageQuality === "medium" ? 0.7 : 0.9;

      // Use SnapDOM to capture the element
      const result = await snapdom(element, {
        useProxy: "https://proxy.corsfix.com/?url=",
        backgroundColor: "#fff",
        embedFonts: true,
        compress: true,
        fast: true,
        quality: qualityValue,
        type: imageFormat,
      });

      // Use SnapDOM's built-in download functionality
      await result.download({
        format: imageFormat,
        filename: `screenshot-${Date.now()}`,
        useProxy: "https://proxy.corsfix.com/?url=",
      });
    } catch (error) {
      console.error("Download error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to download screenshot. Please try again."
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <>
      <div className="h-0">
        <iframe
          ref={contentRef}
          onLoad={handleIframeLoad}
          className="min-h-screen"
          sandbox="allow-same-origin"
        />
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg hover:bg-white transition-colors"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-full md:w-96 bg-white/95 backdrop-blur-sm border-r shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">Your website URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Image format</Label>
                  <Select
                    defaultValue="png"
                    onValueChange={(value: "png" | "jpg" | "webp") =>
                      setImageFormat(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image quality</Label>
                  <Select
                    defaultValue="medium"
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setImageQuality(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Rendering..." : "Render"}
              </Button>

              {error && (
                <div className="flex items-center gap-2 border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="bg-red-100 rounded-full p-1">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium text-red-800">{error}</span>
                </div>
              )}

              {success && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border rounded-lg p-4">
                    <div className="bg-green-100 rounded-full p-1">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium">Success!</span>
                  </div>

                  <Button
                    onClick={handleDownload}
                    className="w-full"
                    variant="outline"
                    disabled={downloadLoading}
                  >
                    {downloadLoading
                      ? "Capturing & Downloading..."
                      : "Download Screenshot"}
                  </Button>
                </div>
              )}
            </form>

            <footer className="mt-12 py-6 border-t text-center text-sm text-muted-foreground">
              s8t is powered by{" "}
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
                cors proxy
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
