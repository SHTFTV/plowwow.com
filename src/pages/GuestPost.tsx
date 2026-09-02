import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle, Send } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { applyPageMeta } from "@/lib/pageMeta";

const TITLE = "Submit a Guest Post | PlowWow Snow Removal Blog";
const DESCRIPTION =
  "Pitch a guest post to PlowWow: share snow removal, strata liability, or winter ops expertise with contractors and property managers across BC.";
const PATH = "/guest-post";

const guestPostSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  topic: z.string().trim().min(1, "Topic is required").max(200, "Topic must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type GuestPostForm = z.infer<typeof guestPostSchema>;

const GuestPost = () => {
  const [form, setForm] = useState<GuestPostForm>({ name: "", email: "", topic: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestPostForm, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    applyPageMeta({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      ogImage: "https://www.plowwow.com/og-default.jpg",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESCRIPTION,
          url: `https://www.plowwow.com${PATH}`,
          isPartOf: { "@type": "WebSite", name: "PlowWow", url: "https://www.plowwow.com" },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.plowwow.com/" },
            { "@type": "ListItem", position: 2, name: "Guest Post", item: `https://www.plowwow.com${PATH}` },
          ],
        },
      ],
    });
  }, []);


  const handleChange = (field: keyof GuestPostForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = guestPostSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof GuestPostForm, string>> = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as keyof GuestPostForm;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("guest_post_submissions").insert({
        name: result.data.name,
        email: result.data.email,
        topic: result.data.topic,
        message: result.data.message,
      });

      if (error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      setForm({ name: "", email: "", topic: "", message: "" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-24 md:py-32 bg-intel-night text-white">
          <div className="container max-w-3xl text-center">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold">
              Guest Post With Us
            </h1>
            <p className="font-tech text-lg text-white/80 mt-6">
              Share your snow removal expertise with the PlowWow community.
            </p>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
              Why Write for PlowWow?
            </h2>
            <ul className="space-y-4 font-tech text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">1.</span>
                <span>Reach thousands of snow removal contractors and property managers across British Columbia.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">2.</span>
                <span>Build authority in the winter services industry with a backlink to your own site.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">3.</span>
                <span>Get your insights in front of strata managers, commercial property owners, and residential clients.</span>
              </li>
            </ul>

            <h2 className="font-display text-2xl md:text-3xl font-bold mt-14 mb-6">
              Topics We Love
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3 font-tech text-muted-foreground">
              {[
                "Snow removal best practices",
                "Equipment reviews & recommendations",
                "BC municipal bylaws & compliance",
                "Liability & insurance tips",
                "Pricing strategies for contractors",
                "Weather forecasting tools",
                "Route optimization",
                "Client retention & marketing",
              ].map((topic) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-intel-orange shrink-0" />
                  {topic}
                </li>
              ))}
            </ul>

            <h2 className="font-display text-2xl md:text-3xl font-bold mt-14 mb-6">
              Submission Guidelines
            </h2>
            <div className="space-y-4 font-tech text-muted-foreground">
              <p>
                Articles should be original, at least 800 words, and provide actionable value to our audience. We accept how-tos, case studies, equipment reviews, and industry analysis.
              </p>
              <p>
                Include a short author bio (2–3 sentences) with one link to your website or social profile. You may also include one relevant image — please ensure you have the rights to use it.
              </p>
            </div>

            <div className="mt-14">
              {submitted ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                  <CheckCircle className="w-12 h-12 text-intel-orange mx-auto mb-4" />
                  <h3 className="font-display text-2xl font-bold mb-2">Thank You!</h3>
                  <p className="font-tech text-muted-foreground mb-6">
                    Your guest post submission has been received. We typically review submissions within 5 business days and will contact you at the email you provided.
                  </p>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/">Return to Home</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 md:p-10 space-y-6" noValidate>
                  <h3 className="font-display text-xl font-bold">Submit Your Guest Post Idea</h3>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Your name"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                      />
                      {errors.name && (
                        <p id="name-error" className="text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                      {errors.email && (
                        <p id="email-error" className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      value={form.topic}
                      onChange={(e) => handleChange("topic", e.target.value)}
                      placeholder="e.g. Best practices for strata snow removal"
                      aria-invalid={!!errors.topic}
                      aria-describedby={errors.topic ? "topic-error" : undefined}
                    />
                    {errors.topic && (
                      <p id="topic-error" className="text-sm text-red-500">{errors.topic}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      placeholder="Tell us about your article idea, your background, and why you'd be a great fit..."
                      rows={6}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? "message-error" : undefined}
                    />
                    {errors.message && (
                      <p id="message-error" className="text-sm text-red-500">{errors.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-intel-orange hover:bg-intel-orange/90 text-white font-display font-bold rounded-full px-8 shadow-xl"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? "Submitting..." : "Submit Guest Post"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default GuestPost;
