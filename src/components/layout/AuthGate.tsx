import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthGateProps {
  children: ReactNode;
}

const AuthGate = ({ children }: AuthGateProps) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setIsChecking(false);
          return;
        }

        if (data.session) {
          navigate("/home", { replace: true });
          return;
        }

        setIsChecking(false);
      } catch {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (isChecking) return null;

  return <>{children}</>;
};

export default AuthGate;
