import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AcademicEmailRequired = () => {
	const navigate = useNavigate();
	const [isSigningOut, setIsSigningOut] = useState(false);

	const signOutAndGo = async (path: "/login" | "/signup") => {
		setIsSigningOut(true);
		try {
			await supabase.auth.signOut();
		} catch {
			// ignore
		} finally {
			navigate(path, { replace: true });
			setIsSigningOut(false);
		}
	};

	return (
		<div className="min-h-screen bg-black text-white p-4 py-12 flex items-center justify-center font-['Space_Grotesk']">
			<div className="w-full max-w-xl">
				<div className="text-center mb-6">
					<div className="text-lg font-semibold tracking-wide text-white/80">Clstr</div>
					<h1 className="text-2xl sm:text-3xl font-bold mt-3">Academic Email Required</h1>
					<p className="text-white/70 mt-2">This network is only for verified students and alumni.</p>
				</div>

				<Card className="bg-white/[0.04] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
					<CardHeader className="text-center">
						<CardTitle className="text-white">Why am I seeing this?</CardTitle>
						<CardDescription className="text-white/70">
							You tried to sign in with a non-academic email address.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="h-px w-full bg-white/10" />
						<p className="text-sm text-white/70 text-center">
							Please sign up or log in using your college/university email (examples: <span className="text-white/90 font-medium">.edu</span>, <span className="text-white/90 font-medium">.edu.in</span>, <span className="text-white/90 font-medium">.ac.in</span>).
						</p>
						<div className="h-px w-full bg-white/10" />

						<div className="space-y-3">
							<Button
								className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15"
								onClick={() => signOutAndGo("/signup")}
								disabled={isSigningOut}
							>
								{isSigningOut ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Redirecting...
									</>
								) : (
									"Use College Email"
								)}
							</Button>
							<Button
								variant="outline"
								className="w-full border-white/15 text-white hover:bg-white/10"
								onClick={() => signOutAndGo("/login")}
								disabled={isSigningOut}
							>
								Go to Login
							</Button>
							<Button
								variant="ghost"
								className="w-full text-white/80 hover:text-white hover:bg-white/5"
								onClick={() => navigate("/", { replace: true })}
								disabled={isSigningOut}
							>
								Back to Home
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default AcademicEmailRequired;
