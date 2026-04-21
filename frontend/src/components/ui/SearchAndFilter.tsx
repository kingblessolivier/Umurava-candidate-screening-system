"use client";
import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterConfig {
  skills?: string[];
  experience?: { min: number; max: number };
  education?: string[];
  availability?: string[];
  status?: string[];
}

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterConfig) => void;
  totalResults?: number;
}

export function SearchAndFilter({
  onSearch,
  onFilterChange,
  totalResults,
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [activeFilters, setActiveFilters] = useState(0);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (newFilters: FilterConfig) => {
    setFilters(newFilters);
    onFilterChange(newFilters);

    // Count active filters
    let count = 0;
    if (newFilters.skills?.length) count += newFilters.skills.length;
    if (newFilters.experience) count += 1;
    if (newFilters.education?.length) count += newFilters.education.length;
    if (newFilters.availability?.length) count += newFilters.availability.length;
    if (newFilters.status?.length) count += newFilters.status.length;
    setActiveFilters(count);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    onSearch("");
    onFilterChange({});
    setActiveFilters(0);
  };

  const SKILL_OPTIONS = ["JavaScript", "React", "Python", "Node.js", "SQL", "AWS"];
  const EDUCATION_OPTIONS = ["High School", "Bachelor", "Master", "PhD", "Bootcamp"];
  const AVAILABILITY_OPTIONS = ["Available Now", "2 Weeks", "1 Month", "3 Months"];
  const STATUS_OPTIONS = ["Applied", "Screening", "Interview", "Offered", "Rejected"];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search candidates by name, email, or skills..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none"
            style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border)" }}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative"
          style={{
            backgroundColor: showFilters ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
            color: showFilters ? "#3b82f6" : "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <ChevronDown className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: "#3b82f6", color: "white" }}
            >
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Results info */}
      {totalResults !== undefined && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {totalResults} result{totalResults !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-4 space-y-4 overflow-hidden"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)" }}
          >
            {/* Skills Filter */}
            <FilterSection title="Skills">
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map(skill => (
                  <button
                    key={skill}
                    onClick={() => {
                      const skills = filters.skills || [];
                      const updated = skills.includes(skill)
                        ? skills.filter(s => s !== skill)
                        : [...skills, skill];
                      handleFilterChange({ ...filters, skills: updated });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: filters.skills?.includes(skill)
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: filters.skills?.includes(skill) ? "#3b82f6" : "var(--text-muted)",
                      border: `1px solid ${filters.skills?.includes(skill) ? "#3b82f6" : "transparent"}`,
                    }}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Experience Filter */}
            <FilterSection title="Experience">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={filters.experience?.min || 0}
                  onChange={e =>
                    handleFilterChange({
                      ...filters,
                      experience: {
                        min: Number(e.target.value),
                        max: filters.experience?.max || 20,
                      },
                    })
                  }
                  placeholder="Min"
                  className="w-16 px-2 py-1.5 rounded-lg text-xs"
                  style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border)" }}
                />
                <span style={{ color: "var(--text-muted)" }}>-</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={filters.experience?.max || 20}
                  onChange={e =>
                    handleFilterChange({
                      ...filters,
                      experience: {
                        min: filters.experience?.min || 0,
                        max: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="Max"
                  className="w-16 px-2 py-1.5 rounded-lg text-xs"
                  style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>years</span>
              </div>
            </FilterSection>

            {/* Education Filter */}
            <FilterSection title="Education">
              <div className="flex flex-wrap gap-2">
                {EDUCATION_OPTIONS.map(edu => (
                  <button
                    key={edu}
                    onClick={() => {
                      const education = filters.education || [];
                      const updated = education.includes(edu)
                        ? education.filter(e => e !== edu)
                        : [...education, edu];
                      handleFilterChange({ ...filters, education: updated });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: filters.education?.includes(edu)
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: filters.education?.includes(edu) ? "#3b82f6" : "var(--text-muted)",
                      border: `1px solid ${filters.education?.includes(edu) ? "#3b82f6" : "transparent"}`,
                    }}
                  >
                    {edu}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Active Filters - Show as chips */}
            {activeFilters > 0 && (
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-wrap gap-1">
                  {filters.skills?.map(s => (
                    <Chip
                      key={`skill-${s}`}
                      label={s}
                      onRemove={() => {
                        const updated = filters.skills!.filter(x => x !== s);
                        handleFilterChange({ ...filters, skills: updated });
                      }}
                    />
                  ))}
                  {filters.education?.map(e => (
                    <Chip
                      key={`edu-${e}`}
                      label={e}
                      onRemove={() => {
                        const updated = filters.education!.filter(x => x !== e);
                        handleFilterChange({ ...filters, education: updated });
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-white mb-2">{title}</p>
      {children}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
      style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:opacity-75 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
