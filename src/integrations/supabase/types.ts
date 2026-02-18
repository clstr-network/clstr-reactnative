export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type GenericTable = {
	Row: Record<string, any>;
	Insert: Record<string, any>;
	Update: Record<string, any>;
};

export type Database = {
	public: {
		Tables: Record<string, GenericTable>;
		Views: Record<string, any>;
		Functions: Record<string, any>;
		Enums: {
			user_role: "Student" | "Alumni" | "Faculty" | "Club" | "Organization";
			skill_level: "Beginner" | "Intermediate" | "Expert" | "Professional";
		};
		CompositeTypes: Record<string, any>;
	};
};
