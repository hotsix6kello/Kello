'use client';

import { useEffect, useRef, useState } from 'react';

import { getMicrophoneErrorMessage, getMicrophoneFallbackStatusMessage } from '@/lib/translator/interpreterUi.ts';
import type { SpeakerRole } from '@/lib/translator/types.ts';

const MAX_RECORDING_MS = 8000;

interface UsePushToTalkRecorderOptions {
  onRecorded: (speaker: SpeakerRole, audioBlob: Blob) => Promise<void> | void;
  onStatusChange?: (message: string | null) => void;
  onError?: (message: string) => void;
}

export function usePushToTalkRecorder(options: UsePushToTalkRecorderOptions) {
  const { onRecorded, onStatusChange, onError } = options;
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recordingRole, setRecordingRole] = useState<SpeakerRole | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeRoleRef = useRef<SpeakerRole | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    setVoiceSupported(isSupported);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  async function startRecording(speaker: SpeakerRole, disabled = false) {
    if (!voiceSupported || recordingRole || disabled) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      activeRoleRef.current = speaker;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const nextRole = activeRoleRef.current;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        cleanupRecording();

        if (!nextRole || audioBlob.size === 0) {
          onStatusChange?.('Recording was empty. Try again or use text input.');
          return;
        }

        await onRecorded(nextRole, audioBlob);
      };

      mediaRecorder.start();
      setRecordingRole(speaker);
      onStatusChange?.('Recording now. Release to send. Maximum 8 seconds.');
      stopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, MAX_RECORDING_MS);
    } catch (error) {
      onError?.(getMicrophoneErrorMessage(error));
      onStatusChange?.(getMicrophoneFallbackStatusMessage());
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return;
    }

    mediaRecorderRef.current.stop();
  }

  function cleanupRecording() {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    activeRoleRef.current = null;
    setRecordingRole(null);
  }

  return {
    voiceSupported,
    recordingRole,
    startRecording,
    stopRecording,
  };
}
