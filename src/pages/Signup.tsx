import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAcademicEmailValidator } from "@/hooks/useAcademicEmailValidator";
import { trackSignupStarted, validateRedirectUrl } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Signup = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { validate } = useAcademicEmailValidator();
	const [searchParams] = useSearchParams();

	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Get redirect URL from query params (used when redirecting from public event view)
	const redirectUrl = searchParams.get('redirect');

	// Track signup page view on mount
	useEffect(() => {
		trackSignupStarted({
			redirect_target: redirectUrl || undefined,
			source: "signup",
		});
	}, [redirectUrl]);

	const handleGoogleSignup = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			// SECURITY: Validate redirectUrl before storing to prevent open-redirect attacks
			if (redirectUrl) {
				const validatedUrl = validateRedirectUrl(redirectUrl);
				if (validatedUrl) {
					sessionStorage.setItem('authReturnUrl', validatedUrl);
				} else {
					console.warn('Invalid redirect URL blocked:', redirectUrl);
				}
			}

			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}/auth/callback`,
					queryParams: {
						access_type: "offline",
						prompt: "select_account",
					},
				},
			});

			if (error) {
				toast({
					title: "Authentication Error",
					description: error.message,
					variant: "destructive",
				});
				setIsSubmitting(false);
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to start Google sign up",
				variant: "destructive",
			});
			setIsSubmitting(false);
		}
	};

	const handleMagicLinkSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		const normalized = email.trim().toLowerCase();
		const result = validate(normalized);
		if (!result.valid) {
			toast({
				title: "Academic email required",
				description: result.message ?? "Please use your college email.",
				variant: "destructive",
			});
			navigate("/academic-email-required", { replace: true });
			return;
		}

		setIsSubmitting(true);
		try {
			// SECURITY: Validate redirectUrl before storing to prevent open-redirect attacks
			if (redirectUrl) {
				const validatedUrl = validateRedirectUrl(redirectUrl);
				if (validatedUrl) {
					sessionStorage.setItem('authReturnUrl', validatedUrl);
				} else {
					console.warn('Invalid redirect URL blocked:', redirectUrl);
				}
			}

			// Send magic link via our Resend-backed edge function (bypasses Supabase rate limits)
			const { data, error: fnError } = await supabase.functions.invoke("send-magic-link", {
				body: {
					email: normalized,
					redirectTo: `${window.location.origin}/auth/callback`,
				},
			});

			if (fnError) throw fnError;

			if (data && !data.success) {
				throw new Error(data.error || "Failed to send magic link");
			}

			navigate("/magic-link-sent", { state: { email: normalized } });
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to send magic link";
			toast({
				title: "Could not send link",
				description: message,
				variant: "destructive",
			});
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
			<div className="absolute top-4 left-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/">
						<ArrowLeft className="h-5 w-5" />
					</Link>
				</Button>
			</div>

			<Card className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-xl shadow-lg">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl text-white">Create your account</CardTitle>
					<CardDescription className="text-white/60">
						Use your college email to join your campus network.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					<Button
						type="button"
						className="w-full bg-white/10 border border-white/15 text-white"
						onClick={handleGoogleSignup}
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Starting...
							</>
						) : (
							"Continue with Google"
						)}
					</Button>

					<div className="relative">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#000000] px-2 text-xs text-white/60">
							or use a magic link
						</span>
					</div>

					<form onSubmit={handleMagicLinkSignup} className="space-y-3">
						<div className="space-y-2">
							<label className="text-sm font-medium text-white" htmlFor="email">
								College email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@university.edu"
									className="pl-10"
									autoComplete="email"
									disabled={isSubmitting}
									required
								/>
							</div>
						</div>

						<Button type="submit" variant="outline" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								"Send magic link"
							)}
						</Button>
					</form>

					<p className="text-center text-sm text-white/60">
						Already have an account? <Link className="text-white/60 hover:text-white hover:underline" to="/login">Sign in</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
};

export default Signup;
