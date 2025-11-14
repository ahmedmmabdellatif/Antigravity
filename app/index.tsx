import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, Upload, AlertCircle, CheckCircle, Trash2, Eye, ExternalLink, Circle, CheckCircle2, ChevronDown, ChevronUp, Play, History as HistoryIcon, Clock, ChevronLeft, MoreVertical, TrendingUp, RefreshCw, Plus, Minus, Home, Dumbbell, User, Receipt, Menu, X, Activity, Heart, Zap, Utensils, Droplet, Pill, Target, AlertTriangle } from "lucide-react-native";
import { FitnessPlan, Workout, CardioSession, DailyMealPlan, WaterIntake, Supplement, RehabMobility, Stretching, ProgressTracking, ProfileGoals, RuleWarning } from "../constants/fitnessTypes";

const STORAGE_KEY_PREFIX = "pdf_parser:document:";
const WORKER_URL = "https://pdf-relay.ahmed-m-m-abdellatif.workers.dev/";

type Domain = {
  type: string;
  confidence: number;
  fields: Record<string, unknown>;
  missing_fields: string[];
  source_coverage: {
    pages_covered: number[];
    pages_with_no_mapped_content: number[];
  };
};

type UniversalEnvelope = {
  domains: Domain[];
};

type ParsedResult = {
  data: UniversalEnvelope;
  timestamp: number;
  fileName: string;
  source: "storage" | "fresh";
};

type StoredDocument = {
  data: UniversalEnvelope;
  timestamp: number;
  fileName: string;
};

type ExerciseHistory = {
  timestamp: number;
  sets: number;
  notes: string;
  completed: boolean;
};

type WorkoutMode = {
  active: boolean;
  workoutIndex: number;
  exerciseIndex: number;
};

type ScreenType = "upload" | "domains" | "fitness" | "documentDetails";

type StaticDomain = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

type FitnessSection = "overview" | "profile" | "workouts" | "cardio" | "mobility" | "stretching" | "nutrition" | "water" | "supplements" | "progress" | "rules";

type FitnessSectionConfig = {
  id: FitnessSection;
  label: string;
  icon: string;
};

type WorkoutViewMode = "overview" | "session" | "";

type SessionState = {
  workoutIndex: number;
  exerciseIndex: number;
  timerRunning: boolean;
  timerSeconds: number;
};

const STATIC_DOMAINS: StaticDomain[] = [
  { id: "fitness", name: "Fitness Plan", description: "Workout routines, nutrition, and tracking", icon: "dumbbell" },
  { id: "resume", name: "Resume / CV", description: "Professional experience and skills", icon: "user" },
  { id: "receipt", name: "Receipt / Invoice", description: "Financial documents and expenses", icon: "receipt" },
  { id: "generic", name: "Generic Document", description: "Other document types", icon: "file" },
];

const FITNESS_SECTIONS: FitnessSectionConfig[] = [
  { id: "overview", label: "Overview", icon: "eye" },
  { id: "profile", label: "Profile", icon: "user" },
  { id: "workouts", label: "Workouts", icon: "dumbbell" },
  { id: "cardio", label: "Cardio", icon: "activity" },
  { id: "mobility", label: "Mobility & Rehab", icon: "zap" },
  { id: "stretching", label: "Stretching", icon: "heart" },
  { id: "nutrition", label: "Nutrition", icon: "utensils" },
  { id: "water", label: "Water", icon: "droplet" },
  { id: "supplements", label: "Supplements", icon: "pill" },
  { id: "progress", label: "Progress", icon: "target" },
  { id: "rules", label: "Rules", icon: "alert" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("upload");
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [documentTab, setDocumentTab] = useState<"overview" | "raw">("overview");
  const [allDocuments, setAllDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [fitnessSection, setFitnessSection] = useState<FitnessSection>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [setChecks, setSetChecks] = useState<Record<string, boolean>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseHistory[]>>({});
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Record<number, boolean>>({});
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>({ active: false, workoutIndex: 0, exerciseIndex: 0 });
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [restTimerActive, setRestTimerActive] = useState<boolean>(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number>(0);
  const [exerciseSets, setExerciseSets] = useState<Record<string, Array<{reps: string, weight: string, rir: string}>>>({});
  const [selectedExerciseInCarousel, setSelectedExerciseInCarousel] = useState<number>(0);
  const [sidebarAnimation] = useState<Animated.Value>(new Animated.Value(0));
  
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>("");
  const [sessionState, setSessionState] = useState<SessionState>({
    workoutIndex: 0,
    exerciseIndex: 0,
    timerRunning: false,
    timerSeconds: 0,
  });

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen, sidebarAnimation]);

  const loadAllDocuments = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const documentKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      
      if (documentKeys.length > 0) {
        const documents: StoredDocument[] = [];
        
        for (const key of documentKeys) {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const doc = JSON.parse(stored) as StoredDocument;
            documents.push(doc);
          }
        }
        
        documents.sort((a, b) => b.timestamp - a.timestamp);
        setAllDocuments(documents);
        console.log(`Loaded ${documents.length} documents from storage`);
        
        if (documents.length > 0) {
          setCurrentScreen("domains");
        }
      }
    } catch (err) {
      console.error("Error loading documents:", err);
    }
  }, []);

  const loadTrackingData = useCallback(async (fileName: string) => {
    if (!fileName) return;
    
    try {
      const checksKey = `pdf_parser:fitness:${fileName}:progress`;
      const notesKey = `pdf_parser:fitness:${fileName}:notes`;
      const historyKey = `pdf_parser:fitness:${fileName}:history`;
      const setsKey = `pdf_parser:fitness:${fileName}:sets`;
      
      const [checksData, notesData, historyData, setsData] = await Promise.all([
        AsyncStorage.getItem(checksKey),
        AsyncStorage.getItem(notesKey),
        AsyncStorage.getItem(historyKey),
        AsyncStorage.getItem(setsKey)
      ]);
      
      if (checksData) {
        const parsed = JSON.parse(checksData);
        setSetChecks(parsed);
        console.log(`Loaded ${Object.keys(parsed).length} set checks from storage`);
      }
      if (notesData) {
        const parsed = JSON.parse(notesData);
        setExerciseNotes(parsed);
        console.log(`Loaded ${Object.keys(parsed).length} exercise notes from storage`);
      }
      if (historyData) {
        const parsed = JSON.parse(historyData);
        setExerciseHistory(parsed);
        console.log(`Loaded ${Object.keys(parsed).length} exercise history entries from storage`);
      }
      if (setsData) {
        const parsed = JSON.parse(setsData);
        setExerciseSets(parsed);
        console.log(`Loaded ${Object.keys(parsed).length} exercise sets from storage`);
      }
    } catch (err) {
      console.error("Error loading tracking data:", err);
    }
  }, []);

  useEffect(() => {
    loadAllDocuments();
  }, [loadAllDocuments]);

  useEffect(() => {
    if (parsedResult?.fileName) {
      loadTrackingData(parsedResult.fileName);
    }
  }, [parsedResult?.fileName, loadTrackingData]);

  const toggleSetCheck = async (workoutName: string, exerciseName: string, setIndex: number) => {
    if (!parsedResult?.fileName) return;
    
    const key = `${workoutName}::${exerciseName}::set_${setIndex}`;
    const newChecks = { ...setChecks, [key]: !setChecks[key] };
    setSetChecks(newChecks);
    
    try {
      const storageKey = `pdf_parser:fitness:${parsedResult.fileName}:progress`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newChecks));
      console.log(`Saved set check: ${key} = ${newChecks[key]}`);
    } catch (err) {
      console.error("Error saving set check:", err);
    }
  };

  const updateExerciseNote = async (workoutName: string, exerciseName: string, note: string) => {
    if (!parsedResult?.fileName) return;
    
    const key = `${workoutName}::${exerciseName}`;
    const newNotes = { ...exerciseNotes, [key]: note };
    setExerciseNotes(newNotes);
    
    try {
      const storageKey = `pdf_parser:fitness:${parsedResult.fileName}:notes`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newNotes));
      console.log(`Saved exercise note: ${key}`);
    } catch (err) {
      console.error("Error saving exercise note:", err);
    }
  };

  const updateExerciseSets = async (workoutName: string, exerciseName: string, sets: Array<{reps: string, weight: string, rir: string}>) => {
    if (!parsedResult?.fileName) return;
    
    const key = `${workoutName}::${exerciseName}`;
    const newSets = { ...exerciseSets, [key]: sets };
    setExerciseSets(newSets);
    
    try {
      const storageKey = `pdf_parser:fitness:${parsedResult.fileName}:sets`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newSets));
      console.log(`Saved exercise sets: ${key}`);
    } catch (err) {
      console.error("Error saving exercise sets:", err);
    }
  };

  const pickDocument = async () => {
    try {
      setError("");
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setParsedResult(null);
        console.log("Selected file:", result.assets[0].name);
      }
    } catch (err) {
      console.error("Error picking document:", err);
      setError("Failed to pick document. Please try again.");
    }
  };

  const sendToWorker = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file first");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Uploading file to Worker relay:", selectedFile.name);

      const formData = new FormData();
      const fileToUpload = {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || "application/pdf",
        name: selectedFile.name,
      } as any;
      formData.append("file", fileToUpload);

      const response = await fetch(WORKER_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          throw new Error(`Worker error: ${response.status} - ${errorText}`);
        }
        throw new Error(errorJson.error || `Worker error: ${response.status}`);
      }

      const jsonData = await response.json();
      console.log("Received parsed JSON from worker");

      const result: ParsedResult = {
        data: jsonData,
        timestamp: Date.now(),
        fileName: selectedFile.name,
        source: "fresh",
      };

      setParsedResult(result);
      const storedResult = { ...result };
      delete (storedResult as any).source;
      const storageKey = `${STORAGE_KEY_PREFIX}${selectedFile.name}_${Date.now()}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(storedResult));
      console.log("Saved parsed result to storage:", result.fileName);
      
      await loadAllDocuments();
      
      const allKeys = await AsyncStorage.getAllKeys();
      const documentKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      const documents: StoredDocument[] = [];
      for (const key of documentKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const doc = JSON.parse(stored) as StoredDocument;
          documents.push(doc);
        }
      }
      documents.sort((a, b) => b.timestamp - a.timestamp);
      
      if (documents.length > 0) {
        const newDoc = documents[0];
        setSelectedDocument(newDoc);
        setDocumentTab("overview");
        setCurrentScreen("documentDetails");
      } else {
        setCurrentScreen("domains");
      }
    } catch (err) {
      console.error("Error sending to Worker:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      
      if (Platform.OS !== "web") {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (fileName: string, timestamp: number) => {
    try {
      setError("");
      
      const allKeys = await AsyncStorage.getAllKeys();
      const documentKeys = allKeys.filter(key => {
        if (!key.startsWith(STORAGE_KEY_PREFIX)) return false;
        const stored = key.substring(STORAGE_KEY_PREFIX.length);
        return stored.includes(fileName);
      });
      
      const fitnessKeys = allKeys.filter(key => key.startsWith(`pdf_parser:fitness:${fileName}`));
      
      const keysToRemove = [...documentKeys, ...fitnessKeys];
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Deleted document ${fileName} and ${keysToRemove.length} related keys`);
      }
      
      if (parsedResult?.fileName === fileName) {
        setParsedResult(null);
        setSelectedFile(null);
        setSetChecks({});
        setExerciseNotes({});
        setExerciseHistory({});
      }
      
      await loadAllDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document");
    }
  };

  const openDocument = (doc: StoredDocument) => {
    setSelectedDocument(doc);
    setDocumentTab("overview");
    setCurrentScreen("documentDetails");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleWorkoutCollapse = (index: number) => {
    setCollapsedWorkouts(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const startWorkout = (workoutIndex: number) => {
    setWorkoutMode({ active: true, workoutIndex, exerciseIndex: 0 });
  };

  const exitWorkoutMode = () => {
    setWorkoutMode({ active: false, workoutIndex: 0, exerciseIndex: 0 });
    setTimerActive(false);
    setRestTimerActive(false);
  };

  const nextExercise = () => {
    const workouts = Array.isArray(parsedResult?.data.domains[0]?.fields.workouts) 
      ? parsedResult.data.domains[0].fields.workouts 
      : [];
    
    if (workouts.length === 0) return;
    
    const currentWorkout = workouts[workoutMode.workoutIndex] as any;
    const exercises = Array.isArray(currentWorkout?.exercises) ? currentWorkout.exercises : [];
    
    if (workoutMode.exerciseIndex < exercises.length - 1) {
      setWorkoutMode(prev => ({ ...prev, exerciseIndex: prev.exerciseIndex + 1 }));
      setTimerActive(false);
      setRestTimerActive(false);
    } else {
      exitWorkoutMode();
    }
  };

  const startRestTimer = (duration: number) => {
    setRestTimerSeconds(duration);
    setRestTimerActive(true);
  };

  useEffect(() => {
    if (!sessionState.timerRunning) return;
    
    const interval = setInterval(() => {
      setSessionState(prev => ({
        ...prev,
        timerSeconds: prev.timerSeconds + 1,
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionState.timerRunning]);
  
  useEffect(() => {
    if (!timerActive) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    if (!restTimerActive) return;
    
    const interval = setInterval(() => {
      setRestTimerSeconds(prev => {
        if (prev <= 1) {
          setRestTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [restTimerActive]);

  const renderExerciseCard = (
    exercise: any,
    workoutName: string,
    exIdx: number,
    showHistory: boolean = false
  ) => {
    const exerciseName = exercise.name || `exercise_${exIdx}`;
    const numSets = typeof exercise.sets === 'number' ? exercise.sets : 0;
    const noteKey = `${workoutName}::${exerciseName}`;
    const history = exerciseHistory[noteKey] || [];
    
    return (
      <View key={exIdx} style={styles.exerciseCard}>
        {exercise.name && (
          <Text style={styles.exerciseCardName}>{exercise.name}</Text>
        )}
        
        <View style={styles.exerciseCardBadges}>
          {exercise.sets && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{exercise.sets} sets</Text>
            </View>
          )}
          {exercise.reps && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{exercise.reps} reps</Text>
            </View>
          )}
          {exercise.rest_seconds && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Rest: {exercise.rest_seconds}s</Text>
            </View>
          )}
          {exercise.tempo && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Tempo: {exercise.tempo}</Text>
            </View>
          )}
        </View>
        
        {numSets > 0 && (
          <View style={styles.setsCheckboxContainer}>
            {Array.from({ length: numSets }, (_, i) => {
              const setKey = `${workoutName}::${exerciseName}::set_${i}`;
              const isChecked = setChecks[setKey] || false;
              
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.setCheckbox}
                  onPress={() => toggleSetCheck(workoutName, exerciseName, i)}
                  activeOpacity={0.7}
                >
                  {isChecked ? (
                    <CheckCircle2 color="#4ADE80" size={32} fill="#4ADE80" />
                  ) : (
                    <Circle color="#64748B" size={32} />
                  )}
                  <Text style={styles.setNumber}>{i + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        
        <TextInput
          style={styles.exerciseNotesInput}
          placeholder="Notes / weight"
          placeholderTextColor="#64748B"
          value={exerciseNotes[noteKey] || ''}
          onChangeText={(text) => updateExerciseNote(workoutName, exerciseName, text)}
        />
        
        {exercise.notes && (
          <Text style={styles.exerciseCardNotes}>Coach notes: {exercise.notes}</Text>
        )}
        
        {exercise.media_url && (
          <View style={styles.linkContainer}>
            <ExternalLink color="#60A5FA" size={14} />
            <Text style={styles.linkText}>{exercise.media_url}</Text>
          </View>
        )}
        
        {exercise.source_pages && exercise.source_pages.length > 0 && (
          <Text style={styles.exerciseMeta}>Pages: {exercise.source_pages.join(", ")}</Text>
        )}
        
        {showHistory && history.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <HistoryIcon color="#60A5FA" size={16} />
              <Text style={styles.historyTitle}>History ({history.length})</Text>
            </View>
            {history.slice(-3).reverse().map((entry, idx) => (
              <View key={idx} style={styles.historyEntry}>
                <Text style={styles.historyText}>
                  {new Date(entry.timestamp).toLocaleDateString()} • {entry.sets} sets
                </Text>
                {entry.notes && (
                  <Text style={styles.historyNotes}>{entry.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // SCREEN 1: UPLOAD
  const renderUploadScreen = () => (
    <View style={styles.screenContainer}>
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#334155"]}
        style={styles.gradient}
      >
        <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <FileText color="#60A5FA" size={32} strokeWidth={2} />
            </View>
            <Text style={styles.title}>PDF Parser</Text>
            <Text style={styles.subtitle}>
              Upload a PDF to extract structured data via OpenAI
            </Text>
          </View>

          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
              activeOpacity={0.8}
            >
              <View style={styles.uploadButtonIcon}>
                <Upload color="#60A5FA" size={24} />
              </View>
              <Text style={styles.uploadButtonText}>
                {selectedFile ? "Change File" : "Select PDF"}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <View style={styles.fileInfo}>
                <View style={styles.fileInfoIcon}>
                  <CheckCircle color="#10B981" size={20} />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(selectedFile.size! / 1024).toFixed(1)} KB
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedFile || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendToWorker}
              disabled={!selectedFile || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <View style={styles.sendButtonIcon}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                  <Text style={styles.sendButtonText}>Processing...</Text>
                </>
              ) : (
                <Text style={styles.sendButtonText}>Send to OpenAI</Text>
              )}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIcon}>
                <AlertCircle color="#EF4444" size={20} />
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Secure Relay Endpoint</Text>
            <Text style={styles.infoText}>
              Files are sent to a Cloudflare Worker that securely forwards them to OpenAI.
            </Text>
            <Text style={styles.infoText}>
              Your API key is stored safely in the Worker environment.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );

  // SCREEN 2: DOMAINS (STATIC LIST + PARSED DOCUMENTS)
  const renderDomainsScreen = () => {
    return (
      <View style={styles.screenContainer}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#334155"]}
          style={styles.gradient}
        >
          <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Eye color="#4ADE80" size={32} strokeWidth={2} />
              </View>
              <Text style={styles.title}>Domains</Text>
              <Text style={styles.subtitle}>
                Explore different mini-apps
              </Text>
            </View>

            <View style={styles.domainsContainer}>
              {STATIC_DOMAINS.map((domain) => {
                const IconComponent = domain.icon === "dumbbell" ? Dumbbell : 
                                     domain.icon === "user" ? User : 
                                     domain.icon === "receipt" ? Receipt : FileText;
                
                return (
                  <TouchableOpacity
                    key={domain.id}
                    style={styles.staticDomainCard}
                    onPress={() => {
                      if (domain.id === "fitness") {
                        const fitnessPlan = extractFitnessData();
                        if (!fitnessPlan) {
                          if (Platform.OS !== "web") {
                            Alert.alert("No Fitness Plan", "Please parse a fitness PDF first to use this feature.");
                          }
                          return;
                        }
                        setCurrentScreen("fitness");
                        setFitnessSection("overview");
                        setWorkoutViewMode("");
                        setIsSidebarOpen(true);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.staticDomainIcon}>
                      <IconComponent color="#3DD0D0" size={32} />
                    </View>
                    <View style={styles.staticDomainInfo}>
                      <Text style={styles.staticDomainName}>{domain.name}</Text>
                      <Text style={styles.staticDomainDescription}>{domain.description}</Text>
                    </View>
                    <View style={styles.staticDomainArrow}>
                      <ChevronDown color="#94A3B8" size={24} style={{ transform: [{ rotate: '-90deg' }] }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {allDocuments.length > 0 && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Parsed Documents</Text>
                <View style={styles.domainsContainer}>
                  {allDocuments.map((doc, idx) => {
                    const domains = doc.data.domains || [];
                    const hasFitnessPlan = domains.some(d => d.type === "fitness_plan");
                    
                    return (
                      <View key={idx} style={styles.documentCard}>
                        <TouchableOpacity
                          style={styles.documentCardContent}
                          onPress={() => openDocument(doc)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.documentCardHeader}>
                            <View style={styles.documentCardIcon}>
                              {hasFitnessPlan ? (
                                <Dumbbell color="#4ADE80" size={24} />
                              ) : (
                                <FileText color="#60A5FA" size={24} />
                              )}
                            </View>
                            <View style={styles.documentCardInfo}>
                              <Text style={styles.documentCardTitle} numberOfLines={1}>
                                {doc.fileName}
                              </Text>
                              <Text style={styles.documentCardMeta}>
                                {new Date(doc.timestamp).toLocaleDateString()} • {domains.length} {domains.length === 1 ? 'domain' : 'domains'}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.documentCardDomains}>
                            {domains.map((domain, dIdx) => (
                              <View key={dIdx} style={styles.documentDomainBadge}>
                                <Text style={styles.documentDomainText}>
                                  {domain.type === "fitness_plan" ? "Fitness Plan" : domain.type}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.documentDeleteButton}
                          onPress={() => deleteDocument(doc.fileName, doc.timestamp)}
                          activeOpacity={0.7}
                        >
                          <Trash2 color="#EF4444" size={20} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  const startWorkoutSession = (workoutIndex: number) => {
    setWorkoutViewMode("session");
    setSessionState({
      workoutIndex,
      exerciseIndex: 0,
      timerRunning: false,
      timerSeconds: 0,
    });
  };
  
  const exitWorkoutSession = () => {
    setWorkoutViewMode("overview");
    setSessionState({
      workoutIndex: 0,
      exerciseIndex: 0,
      timerRunning: false,
      timerSeconds: 0,
    });
  };
  
  const renderWorkoutProgramOverview = () => {
    const parsedFitnessData = extractFitnessData();
    
    if (!parsedFitnessData) {
      return (
        <View style={styles.screenContainer}>
          <LinearGradient
            colors={["#0F172A", "#1E293B"]}
            style={styles.gradient}
          >
            <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.emptyText}>No fitness plan found. Please parse a fitness PDF first.</Text>
            </ScrollView>
          </LinearGradient>
        </View>
      );
    }
    
    const data = parsedFitnessData;
    const workouts = data.workouts;
    
    return (
      <View style={styles.screenContainer}>
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          style={styles.gradient}
        >
          <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Dumbbell color="#4ADE80" size={32} strokeWidth={2} />
              </View>
              <Text style={styles.title}>Training Program</Text>
              <Text style={styles.subtitle}>Select a workout to begin</Text>
            </View>
            
            <View style={styles.programOverviewCards}>
              {workouts.map((workout: any, idx: number) => {
                const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
                const pagesCovered = workout.source_pages || [];
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.programDayCard}
                    onPress={() => startWorkoutSession(idx)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.programDayHeader}>
                      <View style={styles.programDayIconContainer}>
                        <Dumbbell color="#3DD0D0" size={28} />
                      </View>
                      <View style={styles.programDayInfo}>
                        <Text style={styles.programDayName}>{workout.name}</Text>
                        {workout.day_label && (
                          <Text style={styles.programDayLabel}>{workout.day_label}</Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.programDayStats}>
                      <View style={styles.programDayStat}>
                        <Text style={styles.programDayStatValue}>{exercises.length}</Text>
                        <Text style={styles.programDayStatLabel}>Exercises</Text>
                      </View>
                      {pagesCovered.length > 0 && (
                        <View style={styles.programDayStat}>
                          <Text style={styles.programDayStatValue}>{pagesCovered.length}</Text>
                          <Text style={styles.programDayStatLabel}>Pages</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.programDayFooter}>
                      <Play color="#3DD0D0" size={16} />
                      <Text style={styles.programDayStartText}>Start Workout</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };
  
  const renderWorkoutSessionScreen = () => {
    const parsedFitnessData = extractFitnessData();
    
    if (!parsedFitnessData) {
      exitWorkoutSession();
      return null;
    }
    
    const data = parsedFitnessData;
    const workouts = data.workouts;
    const currentWorkout = workouts[sessionState.workoutIndex] as any;
    
    if (!currentWorkout) {
      exitWorkoutSession();
      return null;
    }
    
    const exercises = Array.isArray(currentWorkout.exercises) ? currentWorkout.exercises : [];
    const currentExercise = exercises[sessionState.exerciseIndex];
    
    if (!currentExercise) {
      exitWorkoutSession();
      return null;
    }
    
    const workoutName = currentWorkout.name || `workout_${sessionState.workoutIndex}`;
    const exerciseName = currentExercise.name || `exercise_${sessionState.exerciseIndex}`;
    const restSeconds = typeof currentExercise.rest_seconds === 'number' ? currentExercise.rest_seconds : 60;
    const setKey = `${workoutName}::${exerciseName}`;
    const currentSets = exerciseSets[setKey] || [
      { reps: currentExercise.reps || '10', weight: '-', rir: '2' },
      { reps: currentExercise.reps || '10', weight: '-', rir: '2' },
      { reps: currentExercise.reps || '10', weight: '-', rir: '0' },
    ];
    
    const formatTimer = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    
    const updateSetValue = (setIndex: number, field: 'reps' | 'weight' | 'rir', value: string) => {
      const newSets = [...currentSets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      updateExerciseSets(workoutName, exerciseName, newSets);
    };
    
    const addSet = () => {
      const lastSet = currentSets[currentSets.length - 1] || { reps: '10', weight: '-', rir: '2' };
      const newSets = [...currentSets, { ...lastSet }];
      updateExerciseSets(workoutName, exerciseName, newSets);
    };
    
    const removeSet = () => {
      if (currentSets.length > 1) {
        const newSets = currentSets.slice(0, -1);
        updateExerciseSets(workoutName, exerciseName, newSets);
      }
    };
    
    const goToExercise = (index: number) => {
      if (index >= 0 && index < exercises.length) {
        setSessionState(prev => ({
          ...prev,
          exerciseIndex: index,
        }));
      }
    };
    
    const nextExerciseInSession = () => {
      if (sessionState.exerciseIndex < exercises.length - 1) {
        setSessionState(prev => ({
          ...prev,
          exerciseIndex: prev.exerciseIndex + 1,
        }));
      } else {
        exitWorkoutSession();
      }
    };
    
    const toggleTimer = () => {
      setSessionState(prev => ({
        ...prev,
        timerRunning: !prev.timerRunning,
      }));
    };
    
    return (
      <View style={styles.screenContainer}>
        <View style={{ backgroundColor: "#000000" }}>
          <View style={[styles.modernNavBar, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.modernNavBackButton}
              onPress={exitWorkoutSession}
              activeOpacity={0.7}
            >
              <ChevronLeft color="#E2E8F0" size={28} />
            </TouchableOpacity>
            
            <View style={styles.modernNavCenter}>
              <Text style={styles.modernNavTimer}>{formatTimer(sessionState.timerSeconds)}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.modernNavStartButton}
              onPress={toggleTimer}
              activeOpacity={0.7}
            >
              <Text style={styles.modernNavStartText}>{sessionState.timerRunning ? 'Pause' : 'Start'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView
          style={styles.modernWorkoutContainer}
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exerciseCarousel}
            contentContainerStyle={styles.exerciseCarouselContent}
          >
            {exercises.map((ex: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.carouselItem,
                  idx === sessionState.exerciseIndex && styles.carouselItemActive,
                ]}
                onPress={() => goToExercise(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.carouselPlaceholder}>
                  <Text style={styles.carouselPlaceholderText}>{idx + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.exerciseImageContainer}>
            <View style={styles.exerciseImagePlaceholder}>
              <Text style={styles.exerciseImagePlaceholderText}>Exercise Demo</Text>
            </View>
          </View>
          
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseInfoTitle}>{currentExercise.name || 'Exercise'}</Text>
            <Text style={styles.exerciseInfoSubtitle}>
              {currentExercise.tempo || 'Bodyweight'}
            </Text>
            
            {currentExercise.media_url && (
              <TouchableOpacity style={styles.howToButton} activeOpacity={0.7}>
                <Play color="#3DD0D0" size={16} />
                <Text style={styles.howToText}>How to</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            <View style={styles.actionButton}>
              <Clock color="#E2E8F0" size={18} />
              <Text style={styles.actionButtonText}>{restSeconds ? `${Math.floor(restSeconds / 60)}:${(restSeconds % 60).toString().padStart(2, '0')}` : '2:00'}</Text>
            </View>
            
            <View style={styles.actionButton}>
              <RefreshCw color="#E2E8F0" size={18} />
              <Text style={styles.actionButtonText}>Replace</Text>
            </View>
            
            <View style={styles.actionButton}>
              <TrendingUp color="#E2E8F0" size={18} />
              <Text style={styles.actionButtonText}>History</Text>
            </View>
            
            <View style={styles.actionButton}>
              <MoreVertical color="#E2E8F0" size={18} />
              <Text style={styles.actionButtonText}>More</Text>
            </View>
          </View>
          
          <View style={styles.setsTable}>
            <View style={styles.setsTableHeader}>
              <Text style={[styles.setsTableHeaderText, { width: 40 }]}>#</Text>
              <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>KG{"\n"}Added Weight</Text>
              <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>RIR</Text>
              <View style={{ width: 40 }} />
            </View>
            
            <Text style={styles.assessmentLabel}>Assessment Set</Text>
            
            {currentSets.map((set, idx) => {
              const checkKey = `${workoutName}::${exerciseName}::set_${idx}`;
              const isChecked = setChecks[checkKey] || false;
              
              return (
                <View key={idx} style={styles.setRow}>
                  <Text style={[styles.setRowNumber, { width: 40 }]}>{idx + 1}</Text>
                  
                  <View style={[styles.setInput, { flex: 1 }]}>
                    <TextInput
                      style={styles.setInputText}
                      value={set.reps}
                      onChangeText={(val) => updateSetValue(idx, 'reps', val)}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  
                  <View style={[styles.setInput, { flex: 1 }]}>
                    <TextInput
                      style={styles.setInputText}
                      value={set.weight}
                      onChangeText={(val) => updateSetValue(idx, 'weight', val)}
                      placeholder="-"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  
                  <View style={[styles.setInput, { flex: 1 }]}>
                    <TextInput
                      style={styles.setInputText}
                      value={set.rir}
                      onChangeText={(val) => updateSetValue(idx, 'rir', val)}
                      keyboardType="numeric"
                      placeholder="2"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.setCheckbox2, { width: 40 }]}
                    onPress={() => toggleSetCheck(workoutName, exerciseName, idx)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.setCheckboxInner,
                      isChecked && styles.setCheckboxInnerChecked
                    ]} />
                  </TouchableOpacity>
                </View>
              );
            })}
            
            <View style={styles.setActions}>
              <TouchableOpacity
                style={[styles.setActionButton, styles.setActionButtonRemove]}
                onPress={removeSet}
                activeOpacity={0.7}
                disabled={currentSets.length <= 1}
              >
                <Minus color={currentSets.length <= 1 ? "#475569" : "#E2E8F0"} size={20} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.setActionButton, styles.setActionButtonAdd]}
                onPress={addSet}
                activeOpacity={0.7}
              >
                <Plus color="#E2E8F0" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        
        <View style={[styles.startWorkoutButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.modernStartButton}
            onPress={nextExerciseInSession}
            activeOpacity={0.8}
          >
            <Text style={styles.modernStartButtonText}>
              {sessionState.exerciseIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish workout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderFitnessSectionIcon = (iconName: string, color: string, size: number = 20) => {
    switch (iconName) {
      case "eye": return <Eye color={color} size={size} />;
      case "user": return <User color={color} size={size} />;
      case "dumbbell": return <Dumbbell color={color} size={size} />;
      case "activity": return <Activity color={color} size={size} />;
      case "zap": return <Zap color={color} size={size} />;
      case "heart": return <Heart color={color} size={size} />;
      case "utensils": return <Utensils color={color} size={size} />;
      case "droplet": return <Droplet color={color} size={size} />;
      case "pill": return <Pill color={color} size={size} />;
      case "target": return <Target color={color} size={size} />;
      case "alert": return <AlertTriangle color={color} size={size} />;
      default: return <FileText color={color} size={size} />;
    }
  };

  const extractFitnessData = (): FitnessPlan | null => {
    let fitnessDomain: Domain | undefined;
    
    if (selectedDocument) {
      fitnessDomain = selectedDocument.data.domains?.find(d => d.type === "fitness_plan");
    }
    
    if (!fitnessDomain && allDocuments.length > 0) {
      for (const doc of allDocuments) {
        fitnessDomain = doc.data.domains?.find(d => d.type === "fitness_plan");
        if (fitnessDomain) break;
      }
    }
    
    if (!fitnessDomain) return null;
    
    const fields = fitnessDomain.fields;
    const meta = (fields.meta as any) || {};
    const profile = (fields.profile as any) || {};
    const goals = (fields.goals as any) || {};
    const schedule = (fields.schedule as any) || {};
    const nutrition = (fields.nutrition as any) || {};
    const cardio = (fields.cardio as any) || {};
    const mobilityRehab = (fields.mobility_rehab as any) || {};
    const stretching = (fields.stretching as any) || {};
    const water = (fields.water as any) || {};
    const supplements = (fields.supplements as any) || {};
    const progress = (fields.progress as any) || {};
    const rules = (fields.rules as any) || {};
    
    const fitnessPlan: FitnessPlan = {
      meta: {
        plan_name: meta.plan_name || "Fitness Plan",
        coach_name: meta.coach_name || null,
        duration_weeks: meta.duration_weeks || null,
        level: meta.target_level || null,
        days_per_week: schedule.days_per_week || null,
        split: Array.isArray(schedule.weekly_split) ? schedule.weekly_split.join(", ") : null,
        equipment: null,
      },
      profile_goals: {
        age: profile.age || null,
        height: profile.height_cm ? `${profile.height_cm} cm` : null,
        current_weight: profile.weight_kg ? `${profile.weight_kg} kg` : null,
        current_body_fat: profile.body_fat_percent ? `${profile.body_fat_percent}%` : null,
        target_weight: null,
        target_body_fat: null,
        primary_goal: goals.primary || null,
        secondary_goals: Array.isArray(goals.secondary) ? goals.secondary : [],
        timeline: meta.duration_weeks ? `${meta.duration_weeks} weeks` : null,
        injuries: Array.isArray(profile.injuries) && profile.injuries.length > 0 ? profile.injuries.join(", ") : "None",
        constraints: Array.isArray(profile.constraints) && profile.constraints.length > 0 ? profile.constraints.join(", ") : "None",
      },
      workouts: Array.isArray(fields.workouts) ? (fields.workouts as any[]).map((w: any) => ({
        name: w.name || "Workout",
        day_label: w.label || null,
        exercises: Array.isArray(w.exercises) ? (w.exercises as any[]).map((e: any) => ({
          name: e.name || "Exercise",
          sets: e.sets || null,
          reps: e.reps || null,
          rest_seconds: e.rest_seconds || null,
          tempo: e.tempo || null,
          notes: e.notes || null,
          media_url: Array.isArray(e.media) && e.media.length > 0 && e.media[0].type === "video" ? e.media[0].url : null,
          source_pages: Array.isArray(e.pages) ? e.pages : [],
        })) : [],
        source_pages: Array.isArray(w.pages) ? w.pages : [],
      })) : [],
      cardio: Array.isArray(cardio.sessions) ? (cardio.sessions as any[]).map((s: any) => ({
        type: s.type || "Cardio",
        duration_minutes: s.duration_minutes || null,
        intensity: s.intensity || null,
        frequency: s.frequency || null,
        protocol: s.protocol || null,
        notes: s.notes || null,
      })) : [],
      rehab_mobility: Array.isArray(mobilityRehab.routines) ? (mobilityRehab.routines as any[]).map((r: any) => ({
        category: r.category || "Mobility",
        exercises: Array.isArray(r.exercises) ? r.exercises : [],
      })) : [],
      stretching: {
        post_workout: Array.isArray(stretching.post_workout) ? stretching.post_workout : [],
        evening_routine: Array.isArray(stretching.evening_routine) ? stretching.evening_routine : [],
        pre_workout: Array.isArray(stretching.pre_workout) ? stretching.pre_workout : [],
      },
      meals: Array.isArray(nutrition.meals) ? (nutrition.meals as any[]).map((m: any) => ({
        day: m.day || "Day",
        meals: Array.isArray(m.meals) ? (m.meals as any[]).map((meal: any) => ({
          name: meal.name || "Meal",
          time: meal.time || null,
          foods: Array.isArray(meal.foods) ? meal.foods : [],
          macros: meal.macros || null,
        })) : [],
        daily_totals: m.daily_totals || null,
      })) : [],
      water_intake: {
        daily_goal_liters: water.target_liters_per_day || null,
        notes: Array.isArray(water.notes) && water.notes.length > 0 ? water.notes.join(". ") : null,
      },
      supplements: Array.isArray(supplements.items) ? (supplements.items as any[]).map((s: any) => ({
        name: s.name || "Supplement",
        dosage: s.dosage || "As directed",
        timing: s.timing || null,
        notes: s.notes || null,
      })) : [],
      progress_tracking: {
        check_in_frequency: progress.check_in_frequency || null,
        weekly_measurements: Array.isArray(progress.weekly_measurements) ? progress.weekly_measurements : [],
        monthly_assessments: Array.isArray(progress.monthly_assessments) ? progress.monthly_assessments : [],
        required_photos: Array.isArray(progress.required_photos) ? progress.required_photos : [],
      },
      rules_warnings: [
        ...(
          Array.isArray(rules.general) 
            ? rules.general.map((r: string) => ({ type: "rule" as const, text: r }))
            : []
        ),
        ...(
          Array.isArray(rules.warnings)
            ? rules.warnings.map((w: string) => ({ type: "warning" as const, text: w }))
            : []
        ),
      ],
    };
    
    console.log("[extractFitnessData] Extracted fitness plan from worker JSON:", fitnessPlan);
    return fitnessPlan;
  };

  const renderFitnessSectionContent = () => {
    const parsedFitnessData = extractFitnessData();
    
    if (!parsedFitnessData) {
      return (
        <View style={styles.sectionContent}>
          <Text style={styles.emptyText}>No fitness plan found. Please parse a fitness PDF first.</Text>
        </View>
      );
    }
    
    const data = parsedFitnessData;
    
    switch (fitnessSection) {
      case "overview":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Plan Overview</Text>
            <View style={styles.overviewCard}>
              {data.meta.plan_name && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Plan Name:</Text>
                  <Text style={styles.overviewValue}>{data.meta.plan_name}</Text>
                </View>
              )}
              {data.meta.coach_name && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Coach:</Text>
                  <Text style={styles.overviewValue}>{data.meta.coach_name}</Text>
                </View>
              )}
              {data.meta.level && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Level:</Text>
                  <Text style={styles.overviewValue}>{data.meta.level}</Text>
                </View>
              )}
              {data.meta.duration_weeks && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Duration:</Text>
                  <Text style={styles.overviewValue}>{data.meta.duration_weeks} weeks</Text>
                </View>
              )}
              {data.meta.days_per_week && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Days per Week:</Text>
                  <Text style={styles.overviewValue}>{data.meta.days_per_week}</Text>
                </View>
              )}
              {data.meta.split && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Split:</Text>
                  <Text style={styles.overviewValue}>{data.meta.split}</Text>
                </View>
              )}
              {data.meta.equipment && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Equipment:</Text>
                  <Text style={styles.overviewValue}>{data.meta.equipment}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case "profile":
        const profile = data.profile_goals;
        const hasAnyProfileData = profile && (
          profile.age || profile.height || profile.current_weight || profile.current_body_fat ||
          profile.target_weight || profile.target_body_fat || profile.primary_goal ||
          (profile.secondary_goals && profile.secondary_goals.length > 0) ||
          profile.timeline || profile.injuries || profile.constraints
        );
        
        if (!hasAnyProfileData) {
          return (
            <View style={styles.sectionContent}>
              <Text style={styles.emptyText}>No profile data in this PDF</Text>
            </View>
          );
        }
        
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Profile & Goals</Text>
            <View style={styles.overviewCard}>
              {profile.age && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Age:</Text>
                  <Text style={styles.overviewValue}>{profile.age}</Text>
                </View>
              )}
              {profile.height && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Height:</Text>
                  <Text style={styles.overviewValue}>{profile.height}</Text>
                </View>
              )}
              {profile.current_weight && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Current Weight:</Text>
                  <Text style={styles.overviewValue}>{profile.current_weight}</Text>
                </View>
              )}
              {profile.current_body_fat && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Body Fat:</Text>
                  <Text style={styles.overviewValue}>{profile.current_body_fat}</Text>
                </View>
              )}
              {profile.target_weight && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Target Weight:</Text>
                  <Text style={styles.overviewValue}>{profile.target_weight}</Text>
                </View>
              )}
              {profile.target_body_fat && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Target Body Fat:</Text>
                  <Text style={styles.overviewValue}>{profile.target_body_fat}</Text>
                </View>
              )}
              {profile.primary_goal && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Primary Goal:</Text>
                  <Text style={styles.overviewValue}>{profile.primary_goal}</Text>
                </View>
              )}
              {profile.secondary_goals && profile.secondary_goals.length > 0 && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Secondary Goals:</Text>
                  <Text style={styles.overviewValue}>{profile.secondary_goals.join(", ")}</Text>
                </View>
              )}
              {profile.timeline && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Timeline:</Text>
                  <Text style={styles.overviewValue}>{profile.timeline}</Text>
                </View>
              )}
              {profile.injuries && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Injuries:</Text>
                  <Text style={styles.overviewValue}>{profile.injuries}</Text>
                </View>
              )}
              {profile.constraints && (
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Constraints:</Text>
                  <Text style={styles.overviewValue}>{profile.constraints}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case "workouts":
        if (!data.workouts || data.workouts.length === 0) {
          return (
            <View style={styles.sectionContent}>
              <Text style={styles.emptyText}>No workouts defined in this PDF</Text>
            </View>
          );
        }
        
        return (
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.viewProgramButton}
              onPress={() => setWorkoutViewMode("overview")}
              activeOpacity={0.8}
            >
              <Dumbbell color="#3DD0D0" size={20} />
              <Text style={styles.viewProgramButtonText}>Open Training Program</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionHeader}>Workouts Summary</Text>
            {data.workouts.map((workout: any, idx: number) => (
              <View key={idx} style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>{workout.name || `Workout ${idx + 1}`}</Text>
                {workout.day_label && (
                  <Text style={styles.summaryCardMeta}>{workout.day_label}</Text>
                )}
                <Text style={styles.summaryCardMeta}>
                  {workout.exercises?.length || 0} exercises
                </Text>
              </View>
            ))}
          </View>
        );

      case "cardio":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Cardio Sessions</Text>
            {data.cardio && data.cardio.length > 0 ? (
              data.cardio.map((session: any, idx: number) => (
                <View key={idx} style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>{session.type}</Text>
                  {session.duration_minutes && (
                    <Text style={styles.summaryCardMeta}>Duration: {session.duration_minutes} min</Text>
                  )}
                  {session.intensity && (
                    <Text style={styles.summaryCardMeta}>Intensity: {session.intensity}</Text>
                  )}
                  {session.frequency && (
                    <Text style={styles.summaryCardMeta}>Frequency: {session.frequency}</Text>
                  )}
                  {session.protocol && (
                    <Text style={styles.summaryCardMeta}>Protocol: {session.protocol}</Text>
                  )}
                  {session.notes && (
                    <Text style={styles.summaryCardNotes}>{session.notes}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No cardio sessions defined</Text>
            )}
          </View>
        );

      case "mobility":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Mobility & Rehab</Text>
            {data.rehab_mobility && data.rehab_mobility.length > 0 ? (
              data.rehab_mobility.map((section: any, idx: number) => (
                <View key={idx} style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>{section.category}</Text>
                  {section.exercises && section.exercises.map((ex: string, exIdx: number) => (
                    <Text key={exIdx} style={styles.listItem}>• {ex}</Text>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No mobility routines defined</Text>
            )}
          </View>
        );

      case "stretching":
        const hasStretchingData = data.stretching && (
          (data.stretching.post_workout && data.stretching.post_workout.length > 0) ||
          (data.stretching.evening_routine && data.stretching.evening_routine.length > 0) ||
          (data.stretching.pre_workout && data.stretching.pre_workout.length > 0)
        );
        
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Stretching Routines</Text>
            {hasStretchingData ? (
              <>
                {data.stretching.pre_workout && data.stretching.pre_workout.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Pre-Workout</Text>
                    {data.stretching.pre_workout.map((stretch: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {stretch}</Text>
                    ))}
                  </View>
                )}
                {data.stretching.post_workout && data.stretching.post_workout.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Post-Workout</Text>
                    {data.stretching.post_workout.map((stretch: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {stretch}</Text>
                    ))}
                  </View>
                )}
                {data.stretching.evening_routine && data.stretching.evening_routine.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Evening Routine</Text>
                    {data.stretching.evening_routine.map((stretch: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {stretch}</Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No stretching routines in this PDF</Text>
            )}
          </View>
        );

      case "nutrition":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Nutrition Plan</Text>
            {data.meals && data.meals.length > 0 ? (
              data.meals.map((dayPlan: any, idx: number) => (
                <View key={idx} style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>{dayPlan.day || `Day ${idx + 1}`}</Text>
                  {dayPlan.daily_totals && (
                    <View style={styles.macrosRow}>
                      {dayPlan.daily_totals.calories && (
                        <View style={styles.macroItem}>
                          <Text style={styles.macroValue}>{dayPlan.daily_totals.calories}</Text>
                          <Text style={styles.macroLabel}>Calories</Text>
                        </View>
                      )}
                      {dayPlan.daily_totals.protein && (
                        <View style={styles.macroItem}>
                          <Text style={styles.macroValue}>{dayPlan.daily_totals.protein}g</Text>
                          <Text style={styles.macroLabel}>Protein</Text>
                        </View>
                      )}
                      {dayPlan.daily_totals.carbs && (
                        <View style={styles.macroItem}>
                          <Text style={styles.macroValue}>{dayPlan.daily_totals.carbs}g</Text>
                          <Text style={styles.macroLabel}>Carbs</Text>
                        </View>
                      )}
                      {dayPlan.daily_totals.fat && (
                        <View style={styles.macroItem}>
                          <Text style={styles.macroValue}>{dayPlan.daily_totals.fat}g</Text>
                          <Text style={styles.macroLabel}>Fat</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {dayPlan.meals && dayPlan.meals.map((meal: any, mealIdx: number) => (
                    <View key={mealIdx} style={styles.mealCard}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealName}>{meal.name || `Meal ${mealIdx + 1}`}</Text>
                        {meal.time && <Text style={styles.mealTime}>{meal.time}</Text>}
                      </View>
                      {meal.foods && meal.foods.map((food: string, foodIdx: number) => (
                        <Text key={foodIdx} style={styles.foodItem}>• {food}</Text>
                      ))}
                      {meal.macros && (
                        <View style={styles.mealMacros}>
                          <Text style={styles.mealMacroText}>
                            {meal.macros.calories ? `${meal.macros.calories} cal` : ''}
                            {meal.macros.protein ? ` • P: ${meal.macros.protein}g` : ''}
                            {meal.macros.carbs ? ` • C: ${meal.macros.carbs}g` : ''}
                            {meal.macros.fat ? ` • F: ${meal.macros.fat}g` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No nutrition information in this PDF</Text>
            )}
          </View>
        );

      case "water":
        const hasWaterData = data.water_intake && (
          data.water_intake.daily_goal_liters || data.water_intake.notes
        );
        
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Water Intake</Text>
            {hasWaterData ? (
              <View style={styles.overviewCard}>
                {data.water_intake.daily_goal_liters && (
                  <View style={styles.waterGoalCard}>
                    <Droplet color="#3DD0D0" size={48} />
                    <Text style={styles.waterGoalValue}>{data.water_intake.daily_goal_liters}L</Text>
                    <Text style={styles.waterGoalLabel}>Daily Goal</Text>
                  </View>
                )}
                {data.water_intake.notes && (
                  <Text style={styles.overviewValue}>{data.water_intake.notes}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>No water intake data in this PDF</Text>
            )}
          </View>
        );

      case "supplements":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Supplements</Text>
            {data.supplements && data.supplements.length > 0 ? (
              data.supplements.map((supp: any, idx: number) => (
                <View key={idx} style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>{supp.name}</Text>
                  <Text style={styles.summaryCardMeta}>Dosage: {supp.dosage}</Text>
                  {supp.timing && (
                    <Text style={styles.summaryCardMeta}>Timing: {supp.timing}</Text>
                  )}
                  {supp.notes && (
                    <Text style={styles.summaryCardNotes}>{supp.notes}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No supplements defined</Text>
            )}
          </View>
        );

      case "progress":
        const hasProgressData = data.progress_tracking && (
          data.progress_tracking.check_in_frequency ||
          (data.progress_tracking.weekly_measurements && data.progress_tracking.weekly_measurements.length > 0) ||
          (data.progress_tracking.monthly_assessments && data.progress_tracking.monthly_assessments.length > 0) ||
          (data.progress_tracking.required_photos && data.progress_tracking.required_photos.length > 0)
        );
        
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Progress Tracking</Text>
            {hasProgressData ? (
              <View style={styles.summaryCard}>
                {data.progress_tracking.check_in_frequency && (
                  <View style={styles.overviewRow}>
                    <Text style={styles.overviewLabel}>Check-in Frequency:</Text>
                    <Text style={styles.overviewValue}>{data.progress_tracking.check_in_frequency}</Text>
                  </View>
                )}
                {data.progress_tracking.weekly_measurements && data.progress_tracking.weekly_measurements.length > 0 && (
                  <View style={styles.progressSection}>
                    <Text style={styles.progressSectionTitle}>Weekly Measurements:</Text>
                    {data.progress_tracking.weekly_measurements.map((m: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {m}</Text>
                    ))}
                  </View>
                )}
                {data.progress_tracking.monthly_assessments && data.progress_tracking.monthly_assessments.length > 0 && (
                  <View style={styles.progressSection}>
                    <Text style={styles.progressSectionTitle}>Monthly Assessments:</Text>
                    {data.progress_tracking.monthly_assessments.map((m: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {m}</Text>
                    ))}
                  </View>
                )}
                {data.progress_tracking.required_photos && data.progress_tracking.required_photos.length > 0 && (
                  <View style={styles.progressSection}>
                    <Text style={styles.progressSectionTitle}>Required Photos:</Text>
                    {data.progress_tracking.required_photos.map((p: string, idx: number) => (
                      <Text key={idx} style={styles.listItem}>• {p}</Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>No progress tracking data in this PDF</Text>
            )}
          </View>
        );

      case "rules":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionHeader}>Rules & Warnings</Text>
            {data.rules_warnings && data.rules_warnings.length > 0 ? (
              data.rules_warnings.map((item: any, idx: number) => (
                <View key={idx} style={[
                  styles.ruleCard,
                  item.type === "warning" && styles.warningCard
                ]}>
                  <View style={styles.ruleHeader}>
                    {item.type === "warning" ? (
                      <AlertTriangle color="#F59E0B" size={20} />
                    ) : (
                      <CheckCircle color="#3DD0D0" size={20} />
                    )}
                    <Text style={[
                      styles.ruleType,
                      item.type === "warning" && styles.warningType
                    ]}>
                      {item.type === "warning" ? "Warning" : "Rule"}
                    </Text>
                  </View>
                  <Text style={styles.ruleText}>{item.text}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No rules or warnings defined</Text>
            )}
          </View>
        );

      default:
        return <Text style={styles.emptyText}>Section not found</Text>;
    }
  };

  // SCREEN 3: DOCUMENT DETAILS (OVERVIEW + RAW JSON)
  const renderDocumentDetailsScreen = () => {
    if (!selectedDocument) {
      return (
        <View style={styles.screenContainer}>
          <LinearGradient
            colors={["#0F172A", "#1E293B", "#334155"]}
            style={styles.gradient}
          >
            <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.emptyText}>No document selected</Text>
            </ScrollView>
          </LinearGradient>
        </View>
      );
    }

    const domains = selectedDocument.data.domains || [];
    const hasFitnessPlan = domains.some(d => d.type === "fitness_plan");

    return (
      <View style={styles.screenContainer}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#334155"]}
          style={styles.gradient}
        >
          <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />

          <View style={styles.documentDetailsHeader}>
            <View style={styles.documentDetailsTabs}>
              <TouchableOpacity
                style={[
                  styles.documentDetailsTab,
                  documentTab === "overview" && styles.documentDetailsTabActive,
                ]}
                onPress={() => setDocumentTab("overview")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.documentDetailsTabText,
                    documentTab === "overview" && styles.documentDetailsTabTextActive,
                  ]}
                >
                  Overview
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.documentDetailsTab,
                  documentTab === "raw" && styles.documentDetailsTabActive,
                ]}
                onPress={() => setDocumentTab("raw")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.documentDetailsTabText,
                    documentTab === "raw" && styles.documentDetailsTabTextActive,
                  ]}
                >
                  Raw JSON
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
          >
            {documentTab === "overview" ? (
              <>
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    {hasFitnessPlan ? (
                      <Dumbbell color="#4ADE80" size={32} strokeWidth={2} />
                    ) : (
                      <FileText color="#60A5FA" size={32} strokeWidth={2} />
                    )}
                  </View>
                  <Text style={styles.title}>{selectedDocument.fileName}</Text>
                  <Text style={styles.subtitle}>
                    {new Date(selectedDocument.timestamp).toLocaleDateString()} • {domains.length} {domains.length === 1 ? 'domain' : 'domains'}
                  </Text>
                </View>

                <View style={styles.documentCardDomains}>
                  {domains.map((domain, idx) => (
                    <View key={idx} style={styles.documentDomainBadge}>
                      <Text style={styles.documentDomainText}>
                        {domain.type === "fitness_plan" ? "Fitness Plan" : domain.type}
                      </Text>
                    </View>
                  ))}
                </View>

                {hasFitnessPlan ? (
                  <TouchableOpacity
                    style={styles.openFitnessButton}
                    onPress={() => {
                      const fitnessPlan = extractFitnessData();
                      if (!fitnessPlan) {
                        Alert.alert("Error", "This PDF does not contain a valid fitness plan.");
                        return;
                      }
                      setCurrentScreen("fitness");
                      setFitnessSection("overview");
                      setWorkoutViewMode("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Dumbbell color="#FFFFFF" size={20} />
                    <Text style={styles.openFitnessButtonText}>Open Fitness App</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noFitnessBanner}>
                    <AlertCircle color="#F59E0B" size={20} />
                    <Text style={styles.noFitnessText}>This PDF does not contain a fitness plan.</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.rawJsonContainer}>
                <Text style={styles.rawJsonTitle}>Raw JSON Response</Text>
                <View style={styles.rawJsonBox}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <Text style={styles.rawJsonText}>
                      {JSON.stringify(selectedDocument.data, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  // SCREEN 4: FITNESS SHELL (USING TEMPLATE DATA)
  const renderFitnessScreen = () => {
    if (workoutViewMode === "session") {
      return renderWorkoutSessionScreen();
    }
    
    if (workoutViewMode === "overview") {
      return renderWorkoutProgramOverview();
    }
    
    // Main fitness shell with sidebar navigation
    
    const parsedFitnessData = extractFitnessData();
    
    if (!parsedFitnessData) {
      return (
        <View style={styles.screenContainer}>
          <LinearGradient
            colors={["#0F172A", "#1E293B"]}
            style={styles.gradient}
          >
            <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Dumbbell color="#4ADE80" size={32} strokeWidth={2} />
                </View>
                <Text style={styles.title}>Fitness Plan</Text>
                <Text style={styles.subtitle}>
                  No fitness plan found. Please parse a fitness PDF first.
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      );
    }
    
    const data = parsedFitnessData;
    const meta = data.meta;
    const workouts = data.workouts;
    
    if (workoutMode.active) {
      const currentWorkout = workouts[workoutMode.workoutIndex] as any;
      const exercises = Array.isArray(currentWorkout?.exercises) ? currentWorkout.exercises : [];
      const currentExercise = exercises[workoutMode.exerciseIndex];
      
      if (!currentExercise) return null;
      
      const workoutName = currentWorkout.name || `workout_${workoutMode.workoutIndex}`;
      const exerciseName = currentExercise.name || `exercise_${workoutMode.exerciseIndex}`;
      const restSeconds = typeof currentExercise.rest_seconds === 'number' ? currentExercise.rest_seconds : 60;
      const setKey = `${workoutName}::${exerciseName}`;
      const currentSets = exerciseSets[setKey] || [
        { reps: currentExercise.reps || '10', weight: '-', rir: '2' },
        { reps: currentExercise.reps || '10', weight: '-', rir: '2' },
        { reps: currentExercise.reps || '10', weight: '-', rir: '0' },
      ];

      const formatTimer = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      const updateSetValue = (setIndex: number, field: 'reps' | 'weight' | 'rir', value: string) => {
        const newSets = [...currentSets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        updateExerciseSets(workoutName, exerciseName, newSets);
      };

      const addSet = () => {
        const lastSet = currentSets[currentSets.length - 1] || { reps: '10', weight: '-', rir: '2' };
        const newSets = [...currentSets, { ...lastSet }];
        updateExerciseSets(workoutName, exerciseName, newSets);
      };

      const removeSet = () => {
        if (currentSets.length > 1) {
          const newSets = currentSets.slice(0, -1);
          updateExerciseSets(workoutName, exerciseName, newSets);
        }
      };
      
      return (
        <View style={styles.screenContainer}>
          <View style={{ backgroundColor: "#000000" }}>
            <View style={[styles.modernNavBar, { paddingTop: insets.top }]}>
              <TouchableOpacity
                style={styles.modernNavBackButton}
                onPress={exitWorkoutMode}
                activeOpacity={0.7}
              >
                <ChevronLeft color="#E2E8F0" size={28} />
              </TouchableOpacity>
              
              <View style={styles.modernNavCenter}>
                <Text style={styles.modernNavTimer}>{formatTimer(timerSeconds)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.modernNavStartButton}
                onPress={() => {
                  if (timerActive) {
                    setTimerActive(false);
                  } else {
                    setTimerActive(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modernNavStartText}>{timerActive ? 'Pause' : 'Start'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.modernWorkoutContainer}
            contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
            showsVerticalScrollIndicator={false}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.exerciseCarousel}
              contentContainerStyle={styles.exerciseCarouselContent}
            >
              {exercises.map((ex: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.carouselItem,
                    idx === workoutMode.exerciseIndex && styles.carouselItemActive,
                  ]}
                  onPress={() => setWorkoutMode(prev => ({ ...prev, exerciseIndex: idx }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.carouselPlaceholder}>
                    <Text style={styles.carouselPlaceholderText}>{idx + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.exerciseImageContainer}>
              <View style={styles.exerciseImagePlaceholder}>
                <Text style={styles.exerciseImagePlaceholderText}>Exercise Demo</Text>
              </View>
            </View>

            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseInfoTitle}>{currentExercise.name || 'Exercise'}</Text>
              <Text style={styles.exerciseInfoSubtitle}>
                {currentExercise.tempo || 'Bodyweight'}
              </Text>
              
              {currentExercise.media_url && (
                <TouchableOpacity style={styles.howToButton} activeOpacity={0.7}>
                  <Play color="#3DD0D0" size={16} />
                  <Text style={styles.howToText}>How to</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.actionButtons}>
              <View style={styles.actionButton}>
                <Clock color="#E2E8F0" size={18} />
                <Text style={styles.actionButtonText}>{restSeconds ? `${restSeconds}:00` : '2:00'}</Text>
              </View>
              
              <View style={styles.actionButton}>
                <RefreshCw color="#E2E8F0" size={18} />
                <Text style={styles.actionButtonText}>Replace</Text>
              </View>
              
              <View style={styles.actionButton}>
                <TrendingUp color="#E2E8F0" size={18} />
                <Text style={styles.actionButtonText}>History</Text>
              </View>
              
              <View style={styles.actionButton}>
                <MoreVertical color="#E2E8F0" size={18} />
                <Text style={styles.actionButtonText}>More</Text>
              </View>
            </View>

            <View style={styles.setsTable}>
              <View style={styles.setsTableHeader}>
                <Text style={[styles.setsTableHeaderText, { width: 40 }]}>#</Text>
                <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Reps</Text>
                <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>KG{"\n"}Added Weight</Text>
                <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>RIR</Text>
                <View style={{ width: 40 }} />
              </View>

              <Text style={styles.assessmentLabel}>Assessment Set</Text>

              {currentSets.map((set, idx) => {
                const checkKey = `${workoutName}::${exerciseName}::set_${idx}`;
                const isChecked = setChecks[checkKey] || false;
                
                return (
                  <View key={idx} style={styles.setRow}>
                    <Text style={[styles.setRowNumber, { width: 40 }]}>{idx + 1}</Text>
                    
                    <View style={[styles.setInput, { flex: 1 }]}>
                      <TextInput
                        style={styles.setInputText}
                        value={set.reps}
                        onChangeText={(val) => updateSetValue(idx, 'reps', val)}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    
                    <View style={[styles.setInput, { flex: 1 }]}>
                      <TextInput
                        style={styles.setInputText}
                        value={set.weight}
                        onChangeText={(val) => updateSetValue(idx, 'weight', val)}
                        placeholder="-"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    
                    <View style={[styles.setInput, { flex: 1 }]}>
                      <TextInput
                        style={styles.setInputText}
                        value={set.rir}
                        onChangeText={(val) => updateSetValue(idx, 'rir', val)}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.setCheckbox2, { width: 40 }]}
                      onPress={() => toggleSetCheck(workoutName, exerciseName, idx)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.setCheckboxInner,
                        isChecked && styles.setCheckboxInnerChecked
                      ]} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <View style={styles.setActions}>
                <TouchableOpacity
                  style={[styles.setActionButton, styles.setActionButtonRemove]}
                  onPress={removeSet}
                  activeOpacity={0.7}
                  disabled={currentSets.length <= 1}
                >
                  <Minus color={currentSets.length <= 1 ? "#475569" : "#E2E8F0"} size={20} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.setActionButton, styles.setActionButtonAdd]}
                  onPress={addSet}
                  activeOpacity={0.7}
                >
                  <Plus color="#E2E8F0" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.startWorkoutButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={styles.modernStartButton}
              onPress={nextExercise}
              activeOpacity={0.8}
            >
              <Text style={styles.modernStartButtonText}>
                {workoutMode.exerciseIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish workout'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.screenContainer}>
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          style={styles.gradient}
        >
          <View style={[styles.fitnessShellHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setIsSidebarOpen(!isSidebarOpen)}
              activeOpacity={0.7}
            >
              {isSidebarOpen ? (
                <X color="#E2E8F0" size={24} />
              ) : (
                <Menu color="#E2E8F0" size={24} />
              )}
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Fitness Plan</Text>
              <Text style={styles.headerSubtitle}>{data.meta.plan_name}</Text>
            </View>
            <View style={styles.menuButton} />
          </View>

          <View style={styles.fitnessShellBody}>
            <ScrollView
              style={styles.fitnessContentArea}
              contentContainerStyle={[styles.fitnessContentScroll, { paddingBottom: insets.bottom + 90 }]}
              showsVerticalScrollIndicator={false}
            >
              {renderFitnessSectionContent()}
            </ScrollView>

            {isSidebarOpen && (
              <TouchableOpacity
                style={styles.drawerBackdrop}
                activeOpacity={1}
                onPress={() => setIsSidebarOpen(false)}
              >
                <Animated.View
                  style={[
                    styles.drawerBackdropOverlay,
                    {
                      opacity: sidebarAnimation,
                    },
                  ]}
                />
              </TouchableOpacity>
            )}

            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [
                    {
                      translateX: sidebarAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-Dimensions.get('window').width * 0.75, 0],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={isSidebarOpen ? 'auto' : 'none'}
            >
              <ScrollView
                style={styles.drawerScrollView}
                contentContainerStyle={styles.drawerContent}
                showsVerticalScrollIndicator={false}
              >
                {FITNESS_SECTIONS.map((section) => {
                  const isActive = fitnessSection === section.id;
                  return (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.drawerItem,
                        isActive && styles.drawerItemActive,
                      ]}
                      onPress={() => {
                        setFitnessSection(section.id);
                        setIsSidebarOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {renderFitnessSectionIcon(
                        section.icon,
                        isActive ? "#3DD0D0" : "#94A3B8",
                        20
                      )}
                      <Text style={[
                        styles.drawerItemText,
                        isActive && styles.drawerItemTextActive,
                      ]}>
                        {section.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderOldFitnessScreen_UNUSED = () => {
    const data = {} as FitnessPlan;
    const meta = data.meta;
    const workouts = data.workouts;
    
    return (
      <View style={styles.screenContainer}>
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          style={styles.gradient}
        >
          <View style={[styles.safeAreaTop, { paddingTop: insets.top }]} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <FileText color="#4ADE80" size={32} strokeWidth={2} />
              </View>
              <Text style={styles.title}>
                {meta?.plan_name || "Fitness Plan"}
              </Text>
              {meta?.coach_name && (
                <Text style={styles.subtitle}>by {meta.coach_name}</Text>
              )}
            </View>

            {workouts.length > 0 && (
              <View style={styles.workoutsSection}>
                {workouts.map((workout: any, idx: number) => {
                  const workoutName = workout.name || `workout_${idx}`;
                  const isCollapsed = collapsedWorkouts[idx] || false;
                  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
                  
                  return (
                    <View key={idx} style={styles.workoutAccordion}>
                      <TouchableOpacity
                        style={styles.workoutAccordionHeader}
                        onPress={() => toggleWorkoutCollapse(idx)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.workoutAccordionLeft}>
                          <Text style={styles.workoutAccordionName}>{workout.name}</Text>
                          {workout.day_label && (
                            <Text style={styles.workoutAccordionMeta}>Day: {workout.day_label}</Text>
                          )}
                          <Text style={styles.workoutAccordionMeta}>{exercises.length} exercises</Text>
                        </View>
                        <View style={styles.workoutAccordionRight}>
                          {isCollapsed ? (
                            <ChevronDown color="#94A3B8" size={24} />
                          ) : (
                            <ChevronUp color="#94A3B8" size={24} />
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      {!isCollapsed && (
                        <View style={styles.workoutAccordionContent}>
                          <TouchableOpacity
                            style={styles.startWorkoutButton}
                            onPress={() => startWorkout(idx)}
                            activeOpacity={0.7}
                          >
                            <Play color="#FFFFFF" size={20} />
                            <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
                          </TouchableOpacity>
                          
                          {exercises.map((ex: any, exIdx: number) => 
                            renderExerciseCard(ex, workoutName, exIdx, true)
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  // BOTTOM NAV BAR
  const renderBottomNav = () => {
    if (workoutMode.active || workoutViewMode === "session") return null;
    
    return (
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setCurrentScreen("upload")}
          activeOpacity={0.7}
        >
          <Home color={currentScreen === "upload" ? "#3DD0D0" : "#94A3B8"} size={24} />
          <Text style={[styles.bottomNavText, currentScreen === "upload" && styles.bottomNavTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => {
            setCurrentScreen("domains");
            setWorkoutViewMode("");
          }}
          activeOpacity={0.7}
        >
          <Eye color={currentScreen === "domains" || currentScreen === "fitness" ? "#3DD0D0" : "#94A3B8"} size={24} />
          <Text style={[styles.bottomNavText, (currentScreen === "domains" || currentScreen === "fitness") && styles.bottomNavTextActive]}>Domains</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // MAIN RENDER - ONLY ONE SCREEN AT A TIME
  return (
    <View style={{ flex: 1 }}>
      {currentScreen === "upload" && renderUploadScreen()}
      {currentScreen === "domains" && renderDomainsScreen()}
      {currentScreen === "documentDetails" && renderDocumentDetailsScreen()}
      {currentScreen === "fitness" && renderFitnessScreen()}
      {renderBottomNav()}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeAreaTop: {
    backgroundColor: "transparent" as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#F1F5F9",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    borderWidth: 2,
    borderColor: "#60A5FA",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderStyle: "dashed",
  },
  uploadButtonIcon: {
    marginRight: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#60A5FA",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  fileInfoIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#E2E8F0",
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: "#94A3B8",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60A5FA",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  sendButtonIcon: {
    marginRight: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorIcon: {
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#EF4444",
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#4ADE80",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#86EFAC",
    lineHeight: 18,
    marginBottom: 4,
  },
  domainsContainer: {
    gap: 16,
  },
  domainCard: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  domainCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  domainCardTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
  },
  domainCardConfidence: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#4ADE80" as const,
    backgroundColor: "rgba(74, 222, 128, 0.15)" as const,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  domainCardSubtitle: {
    fontSize: 14,
    color: "#94A3B8" as const,
  },
  emptyState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#94A3B8" as const,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  documentCard: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(96, 165, 250, 0.3)",
    overflow: "hidden" as const,
  },
  documentCardContent: {
    padding: 16,
  },
  documentCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  documentCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  documentCardInfo: {
    flex: 1,
  },
  documentCardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#F1F5F9",
    marginBottom: 4,
  },
  documentCardMeta: {
    fontSize: 13,
    color: "#94A3B8",
  },
  documentCardDomains: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  documentDomainBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  documentDomainText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4ADE80",
  },
  documentDeleteButton: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  workoutsSection: {
    gap: 16,
  },
  workoutAccordion: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  workoutAccordionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
  },
  workoutAccordionLeft: {
    flex: 1,
  },
  workoutAccordionName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#A78BFA",
    marginBottom: 4,
  },
  workoutAccordionMeta: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  workoutAccordionRight: {
    paddingLeft: 12,
  },
  workoutAccordionContent: {
    padding: 16,
  },
  startWorkoutButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  startWorkoutButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  exerciseCard: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)",
  },
  exerciseCardName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#F1F5F9",
    marginBottom: 12,
  },
  exerciseCardBadges: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#60A5FA",
  },
  exerciseCardNotes: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 165, 250, 0.1)",
  },
  setsCheckboxContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  setCheckbox: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  setNumber: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#94A3B8",
    marginTop: 2,
  },
  exerciseNotesInput: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 8,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  linkText: {
    fontSize: 13,
    color: "#60A5FA",
    textDecorationLine: "underline" as const,
    flex: 1,
  },
  exerciseMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  historySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 165, 250, 0.2)",
  },
  historyHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#60A5FA",
  },
  historyEntry: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  historyText: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    color: "#CBD5E1",
    fontStyle: "italic" as const,
  },
  workoutModeHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(96, 165, 250, 0.3)",
  },
  workoutModeWorkoutName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#A78BFA",
    marginBottom: 4,
  },
  workoutModeProgress: {
    fontSize: 14,
    color: "#94A3B8",
  },
  workoutModeScrollContent: {
    padding: 20,
  },
  workoutModeExercise: {
    flex: 1,
  },
  workoutModeExerciseName: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#F1F5F9",
    marginBottom: 24,
    textAlign: "center" as const,
  },
  restTimerContainer: {
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center" as const,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#60A5FA",
  },
  restTimerLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#60A5FA",
    marginBottom: 8,
  },
  restTimerText: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#60A5FA",
    marginVertical: 12,
  },
  timerButton: {
    backgroundColor: "rgba(226, 232, 240, 0.15)",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  workoutModeActions: {
    gap: 12,
    marginTop: 24,
  },
  restButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  restButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#60A5FA",
  },
  nextButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  modernNavBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#000000" as const,
  },
  modernNavBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modernNavCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  modernNavTimer: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#E2E8F0" as const,
    letterSpacing: 1,
  },
  modernNavStartButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent" as const,
  },
  modernNavStartText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#3DD0D0" as const,
  },
  modernWorkoutContainer: {
    flex: 1,
    backgroundColor: "#000000" as const,
  },
  exerciseCarousel: {
    marginTop: 8,
  },
  exerciseCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)" as const,
    borderWidth: 2,
    borderColor: "transparent" as const,
    overflow: "hidden" as const,
  },
  carouselItemActive: {
    borderColor: "#3DD0D0" as const,
  },
  carouselPlaceholder: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(61, 208, 208, 0.15)" as const,
  },
  carouselPlaceholderText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
  },
  exerciseImageContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    height: 240,
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  exerciseImagePlaceholder: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  exerciseImagePlaceholderText: {
    fontSize: 16,
    color: "#64748B" as const,
  },
  exerciseInfo: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  exerciseInfoTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#E2E8F0" as const,
    marginBottom: 4,
  },
  exerciseInfoSubtitle: {
    fontSize: 16,
    color: "#94A3B8" as const,
    marginBottom: 12,
  },
  howToButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    alignSelf: "flex-start" as const,
  },
  howToText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#3DD0D0" as const,
  },
  actionButtons: {
    flexDirection: "row" as const,
    marginTop: 24,
    marginHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)" as const,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#94A3B8" as const,
    textAlign: "center" as const,
  },
  setsTable: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "rgba(30, 41, 59, 0.6)" as const,
    borderRadius: 16,
    padding: 16,
  },
  setsTableHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(96, 165, 250, 0.2)" as const,
  },
  setsTableHeaderText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#94A3B8" as const,
    textAlign: "center" as const,
  },
  assessmentLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#3DD0D0" as const,
    marginTop: 16,
    marginBottom: 12,
  },
  setRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 8,
  },
  setRowNumber: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#3DD0D0" as const,
    textAlign: "center" as const,
  },
  setInput: {
    backgroundColor: "rgba(15, 23, 42, 0.8)" as const,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)" as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  setInputText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#E2E8F0" as const,
    textAlign: "center" as const,
  },
  setCheckbox2: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  setCheckboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#475569" as const,
    backgroundColor: "transparent" as const,
  },
  setCheckboxInnerChecked: {
    backgroundColor: "#3DD0D0" as const,
    borderColor: "#3DD0D0" as const,
  },
  setActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  setActionButton: {
    flex: 1,
    backgroundColor: "rgba(51, 65, 85, 0.8)" as const,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  setActionButtonRemove: {
    opacity: 1,
  },
  setActionButtonAdd: {},
  startWorkoutButtonContainer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#000000" as const,
  },
  modernStartButton: {
    backgroundColor: "#3DD0D0" as const,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modernStartButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#000000" as const,
  },
  bottomNav: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    backgroundColor: "#1E293B" as const,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 165, 250, 0.2)" as const,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000" as const,
    shadowOffset: { width: 0, height: -4 } as const,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
  },
  bottomNavText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#94A3B8" as const,
    marginTop: 4,
  },
  bottomNavTextActive: {
    color: "#3DD0D0" as const,
  },
  staticDomainCard: {
    backgroundColor: "rgba(30, 41, 59, 0.8)" as const,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(61, 208, 208, 0.3)" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  staticDomainIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(61, 208, 208, 0.15)" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 16,
  },
  staticDomainInfo: {
    flex: 1,
  },
  staticDomainName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 4,
  },
  staticDomainDescription: {
    fontSize: 14,
    color: "#94A3B8" as const,
  },
  staticDomainArrow: {
    marginLeft: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(96, 165, 250, 0.2)" as const,
    marginVertical: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 16,
  },
  programOverviewCards: {
    gap: 16,
  },
  programDayCard: {
    backgroundColor: "rgba(30, 41, 59, 0.8)" as const,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(61, 208, 208, 0.3)" as const,
    marginBottom: 16,
  },
  programDayHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  programDayIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(61, 208, 208, 0.15)" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 16,
  },
  programDayInfo: {
    flex: 1,
  },
  programDayName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 4,
  },
  programDayLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#94A3B8" as const,
  },
  programDayStats: {
    flexDirection: "row" as const,
    gap: 24,
    marginBottom: 20,
  },
  programDayStat: {
    alignItems: "center" as const,
  },
  programDayStatValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
    marginBottom: 4,
  },
  programDayStatLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#94A3B8" as const,
  },
  programDayFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 208, 208, 0.2)" as const,
  },
  programDayStartText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#3DD0D0" as const,
  },
  fitnessShellHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 208, 208, 0.2)" as const,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.05)" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8" as const,
  },
  fitnessShellBody: {
    flex: 1,
    position: "relative" as const,
  },
  drawerBackdrop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  drawerBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)" as const,
  },
  drawer: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    bottom: 0,
    width: "75%" as const,
    backgroundColor: "rgba(15, 23, 42, 0.98)" as const,
    borderRightWidth: 1,
    borderRightColor: "rgba(61, 208, 208, 0.3)" as const,
    zIndex: 20,
    shadowColor: "#000" as const,
    shadowOffset: { width: 2, height: 0 } as const,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerContent: {
    paddingVertical: 16,
  },
  drawerItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent" as const,
  },
  drawerItemActive: {
    backgroundColor: "rgba(61, 208, 208, 0.15)" as const,
    borderLeftColor: "#3DD0D0" as const,
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: "#94A3B8" as const,
  },
  drawerItemTextActive: {
    color: "#3DD0D0" as const,
    fontWeight: "700" as const,
  },
  fitnessContentArea: {
    flex: 1,
  },
  fitnessContentScroll: {
    padding: 20,
  },
  sectionContent: {
    gap: 16,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)" as const,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(61, 208, 208, 0.2)" as const,
    gap: 12,
  },
  overviewRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  overviewLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#94A3B8" as const,
    flex: 1,
  },
  overviewValue: {
    fontSize: 14,
    color: "#E2E8F0" as const,
    flex: 2,
    textAlign: "right" as const,
  },
  summaryCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)" as const,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(61, 208, 208, 0.15)" as const,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 8,
  },
  summaryCardMeta: {
    fontSize: 14,
    color: "#94A3B8" as const,
    marginBottom: 4,
  },
  summaryCardNotes: {
    fontSize: 13,
    color: "#CBD5E1" as const,
    fontStyle: "italic" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 208, 208, 0.1)" as const,
  },
  listItem: {
    fontSize: 14,
    color: "#CBD5E1" as const,
    marginBottom: 6,
    paddingLeft: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B" as const,
    textAlign: "center" as const,
    marginTop: 32,
  },
  viewProgramButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(61, 208, 208, 0.15)" as const,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(61, 208, 208, 0.3)" as const,
  },
  viewProgramButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
  },
  macrosRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 208, 208, 0.2)" as const,
  },
  macroItem: {
    alignItems: "center" as const,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: "#94A3B8" as const,
  },
  mealCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)" as const,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(61, 208, 208, 0.1)" as const,
  },
  mealHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  mealName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#E2E8F0" as const,
  },
  mealTime: {
    fontSize: 13,
    color: "#3DD0D0" as const,
  },
  foodItem: {
    fontSize: 13,
    color: "#CBD5E1" as const,
    marginBottom: 4,
  },
  mealMacros: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 208, 208, 0.1)" as const,
  },
  mealMacroText: {
    fontSize: 11,
    color: "#94A3B8" as const,
  },
  waterGoalCard: {
    alignItems: "center" as const,
    paddingVertical: 20,
    gap: 8,
  },
  waterGoalValue: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
  },
  waterGoalLabel: {
    fontSize: 16,
    color: "#94A3B8" as const,
  },
  progressSection: {
    marginTop: 16,
  },
  progressSectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#E2E8F0" as const,
    marginBottom: 8,
  },
  ruleCard: {
    backgroundColor: "rgba(61, 208, 208, 0.1)" as const,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(61, 208, 208, 0.3)" as const,
  },
  warningCard: {
    backgroundColor: "rgba(245, 158, 11, 0.1)" as const,
    borderColor: "rgba(245, 158, 11, 0.3)" as const,
  },
  ruleHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  ruleType: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#3DD0D0" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  warningType: {
    color: "#F59E0B" as const,
  },
  ruleText: {
    fontSize: 14,
    color: "#E2E8F0" as const,
    lineHeight: 20,
  },
  documentDetailsHeader: {
    backgroundColor: "rgba(30, 41, 59, 0.95)" as const,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(96, 165, 250, 0.2)" as const,
    paddingHorizontal: 20,
  },
  documentDetailsTabs: {
    flexDirection: "row" as const,
    gap: 16,
    paddingTop: 16,
  },
  documentDetailsTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent" as const,
  },
  documentDetailsTabActive: {
    borderBottomColor: "#3DD0D0" as const,
  },
  documentDetailsTabText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#94A3B8" as const,
  },
  documentDetailsTabTextActive: {
    color: "#3DD0D0" as const,
    fontWeight: "700" as const,
  },
  openFitnessButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#4ADE80" as const,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  openFitnessButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF" as const,
  },
  noFitnessBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(245, 158, 11, 0.1)" as const,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)" as const,
  },
  noFitnessText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#F59E0B" as const,
  },
  rawJsonContainer: {
    flex: 1,
  },
  rawJsonTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#F1F5F9" as const,
    marginBottom: 16,
  },
  rawJsonBox: {
    backgroundColor: "rgba(15, 23, 42, 0.9)" as const,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)" as const,
    minHeight: 400,
  },
  rawJsonText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#E2E8F0" as const,
    lineHeight: 18,
  },
});
