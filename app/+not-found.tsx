import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";

export default function NotFoundScreen() {
  const colors = useThemeColors(useColorScheme());

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="compass-outline" size={64} color={colors.textTertiary} />
        <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
        <Link href="/" style={[styles.link, { color: colors.tint }]}>
          <Text style={[styles.linkText, { color: colors.tint }]}>Go back home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  link: {
    marginTop: 8,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
