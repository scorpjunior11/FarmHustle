import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";

interface UseLiveDataOptions {
  pollIntervalMs?: number;
  isActionInProgress?: boolean;
}

export function useLiveData(
  fetchFn: () => Promise<void>,
  options: UseLiveDataOptions = {}
) {
  const { pollIntervalMs = 10000, isActionInProgress = false } = options;
  const appStateRef = useRef<AppStateStatus>("active");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(false);

  // Track app state (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      appStateRef.current = state;
      if (state !== "active" && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      subscription.remove();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Fetch immediately on focus, then start polling if focused and app is active
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      // Fetch immediately when regaining focus
      fetchFn();

      // Start polling: only if app is active and not mid-action
      if (appStateRef.current === "active" && !isActionInProgress) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (isFocusedRef.current && appStateRef.current === "active" && !isActionInProgress) {
            fetchFn();
          }
        }, pollIntervalMs);
      }

      // Cleanup when losing focus
      return () => {
        isFocusedRef.current = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [fetchFn, pollIntervalMs, isActionInProgress])
  );
}
