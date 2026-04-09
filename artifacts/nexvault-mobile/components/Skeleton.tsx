import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.secondary,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Skeleton height={28} width={180} />
      <Skeleton height={56} width={240} />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
        <Skeleton height={120} width={160} borderRadius={16} />
        <Skeleton height={120} width={160} borderRadius={16} />
        <Skeleton height={120} width={160} borderRadius={16} />
      </View>
      <View style={{ gap: 12, marginTop: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Skeleton height={44} width={44} borderRadius={22} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton height={14} width="60%" />
              <Skeleton height={12} width="40%" />
            </View>
            <Skeleton height={16} width={60} />
          </View>
        ))}
      </View>
    </View>
  );
}
