"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
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
import html2canvas from "html2canvas-pro";

export default function Home() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const contentRef = useRef<HTMLIFrameElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1920);
  const [viewportHeight, setViewportHeight] = useState(1080);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const processHtml = (html: string, baseUrl: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const base = new URL(baseUrl);

      // Add base tag
      const baseTag = doc.createElement("base");
      baseTag.href = base.origin;
      doc.head.insertBefore(baseTag, doc.head.firstChild);

      // Process all elements with relative URLs
      const processRelativeUrl = (element: Element, attribute: string) => {
        const value = element.getAttribute(attribute);
        if (value?.startsWith("/")) {
          element.setAttribute(attribute, `${base.origin}${value}`);
        }
      };

      // Handle images
      doc.querySelectorAll('img[src^="/"]').forEach((img) => {
        processRelativeUrl(img, "src");
      });

      // Handle scripts
      doc.querySelectorAll('script[src^="/"]').forEach((script) => {
        processRelativeUrl(script, "src");
      });

      // Handle stylesheets
      doc
        .querySelectorAll('link[rel="stylesheet"][href^="/"]')
        .forEach((link) => {
          processRelativeUrl(link, "href");
        });

      // Handle other resources (fonts, etc.)
      doc.querySelectorAll('link[href^="/"]').forEach((link) => {
        processRelativeUrl(link, "href");
      });

      return doc.documentElement.outerHTML;
    } catch (err) {
      console.error("Error processing HTML:", err);
      return html;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setScreenshot(null);

    try {
      const response = await fetch(`https://proxy.corsfix.com/?${url}`);
      const html = await response.text();
      const processedHtml = processHtml(html, url);

      if (contentRef.current) {
        contentRef.current.srcdoc = processedHtml;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setLoading(false);
    }
  };

  const handleIframeLoad = async () => {
    if (!contentRef.current || !contentRef.current.srcdoc) return;

    try {
      const iframe = contentRef.current;
      const element = iframe.contentWindow?.document.querySelector("body");
      console.log("about to be rendered: ", element);
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        foreignObjectRendering: true,
        logging: true,
        width: viewportWidth,
        height: viewportHeight,
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Cleanup previous objectUrl
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }

          // Create new object URL
          const newObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(newObjectUrl);
          setScreenshot(newObjectUrl);
          setSuccess(true);
        }
      }, "image/png");
    } catch (error) {
      console.error("Screenshot error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">s8t</h1>
          <p className="text-xl text-muted-foreground">
            Capture and customize website screenshots with ease
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image format</Label>
                  <Select defaultValue="jpeg">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image quality</Label>
                  <Select defaultValue="medium">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="viewport-width">Viewport width</Label>
                  <Input
                    id="viewport-width"
                    type="number"
                    value={viewportWidth}
                    onChange={(e) => setViewportWidth(+e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="viewport-height">Viewport height</Label>
                  <Input
                    id="viewport-height"
                    type="number"
                    value={viewportHeight}
                    onChange={(e) => setViewportHeight(+e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Rendering..." : "Render"}
              </Button>

              {success && (
                <div className="flex items-center gap-2 border rounded-lg p-4">
                  <div className="bg-green-100 rounded-full p-1">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">Success!</span>
                  <div className="ml-auto text-xs text-muted-foreground">
                    <a href="#" className="hover:underline">
                      Privacy
                    </a>
                    {" · "}
                    <a href="#" className="hover:underline">
                      Terms
                    </a>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="border rounded-lg p-4 flex items-center justify-center bg-muted">
            {screenshot ? (
              <img src={screenshot} alt="Screenshot" className="max-w-full" />
            ) : (
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Screenshot Preview</p>
                <p className="text-sm text-muted-foreground">
                  Your rendered screenshot will appear here
                </p>
              </div>
            )}
          </div>

          {/* Hidden container for rendering content */}
          <iframe
            ref={contentRef}
            onLoad={handleIframeLoad}
            style={{ position: "absolute", top: "-9999px" }}
            width={viewportWidth}
            height={viewportHeight}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <footer className="mt-12 py-6 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          s8t is powered by{" "}
          <a href="https://corsfix.com" className="font-medium hover:underline">
            Corsfix
          </a>{" "}
          •{" "}
          <a
            href="https://github.com/yourusername/s8t"
            className="font-medium hover:underline"
          >
            Source code
          </a>
        </div>
      </footer>
    </div>
  );
}
