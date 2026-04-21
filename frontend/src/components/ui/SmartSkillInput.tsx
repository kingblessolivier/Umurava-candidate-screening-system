"use client";
import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

interface Skill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

interface SmartSkillInputProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  error?: string;
}

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

export function SmartSkillInput({ skills, onSkillsChange, error }: SmartSkillInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [showLevelMenu, setShowLevelMenu] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle comma-separated input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const parseAndAddSkills = (text: string) => {
    if (!text.trim()) return;

    // Split by comma and parse skill names with optional levels
    const entries = text.split(",").map(s => s.trim()).filter(Boolean);
    const newSkills = [...skills];

    entries.forEach(entry => {
      // Try to parse "SkillName (Level)" format
      const match = entry.match(/^(.+?)\s*\((\w+)\)?$/);
      const skillName = match ? match[1] : entry;
      const skillLevel = match && LEVEL_OPTIONS.includes(match[2] as any)
        ? (match[2] as Skill["level"])
        : "Intermediate";

      // Don't add duplicate
      if (!newSkills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
        newSkills.push({ name: skillName, level: skillLevel });
      }
    });

    onSkillsChange(newSkills);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const text = inputValue.replace(",", "").trim();
      if (text) parseAndAddSkills(text);
    } else if (e.key === "Backspace" && !inputValue && skills.length > 0) {
      // Remove last skill on backspace when input is empty
      onSkillsChange(skills.slice(0, -1));
    }
  };

  const removeSkill = (index: number) => {
    onSkillsChange(skills.filter((_, i) => i !== index));
  };

  const updateSkillLevel = (index: number, level: Skill["level"]) => {
    const updated = [...skills];
    updated[index].level = level;
    onSkillsChange(updated);
    setShowLevelMenu(null);
  };

  const getLevelColor = (level: Skill["level"]) => {
    const colors: Record<Skill["level"], string> = {
      Beginner: "#10b981",
      Intermediate: "#3b82f6",
      Advanced: "#f59e0b",
      Expert: "#ef4444",
    };
    return colors[level];
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">Required Skills</label>

      {/* Skill Chips */}
      <div
        className="flex flex-wrap gap-2 p-3 rounded-lg border transition-colors"
        style={{
          borderColor: error ? "#ef4444" : "var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        {skills.map((skill, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: `${getLevelColor(skill.level)}20`, borderLeft: `3px solid ${getLevelColor(skill.level)}` }}
          >
            <span>{skill.name}</span>
            <span className="text-xs opacity-75">{skill.level}</span>

            {/* Level dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLevelMenu(showLevelMenu === i ? null : i)}
                className="text-xs px-1 py-0.5 rounded hover:opacity-75 transition"
              >
                ⚙️
              </button>
              {showLevelMenu === i && (
                <div
                  className="absolute right-0 mt-1 w-32 rounded-lg shadow-lg z-10"
                  style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", border: "1px solid" }}
                >
                  {LEVEL_OPTIONS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateSkillLevel(i, level)}
                      className="block w-full text-left px-3 py-2 text-sm hover:opacity-75 transition"
                      style={{
                        color: skill.level === level ? getLevelColor(level) : "var(--text-muted)",
                        backgroundColor: skill.level === level ? `${getLevelColor(level)}15` : "transparent",
                      }}
                    >
                      {skill.level === level && "✓ "}{level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeSkill(i)}
              className="ml-1 hover:opacity-75 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue.trim() && parseAndAddSkills(inputValue)}
          placeholder={skills.length === 0 ? "Type skill names or paste: React, Node.js, Python" : "Add more..."}
          className="flex-1 min-w-32 bg-transparent border-0 text-white placeholder-opacity-50 focus:outline-none"
          style={{ color: "white" }}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Helper text */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        💡 Tip: Paste multiple skills separated by commas. Click level icon to change proficiency.
      </p>
    </div>
  );
}
