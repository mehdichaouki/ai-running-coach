// public/app.js

const form = document.getElementById("plan-form");
const submitBtn = document.getElementById("submit-btn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const resultSection = document.getElementById("result-section");
const planOutput = document.getElementById("plan-output");
const courseNotes = document.getElementById("course-notes");

function updateFormForDistance() {
  const distance = document.querySelector('input[name="distance"]:checked').value;
  const isLong = distance === "21k" || distance === "marathon";

  document.getElementById("race-type-section").style.display = isLong ? "block" : "none";

  if (!isLong) {
    document.querySelector('input[name="race_type"][value="general"]').checked = true;
    document.getElementById("marathon-dropdown").style.display = "none";
    document.getElementById("custom-marathon-field").style.display = "none";
  } else {
    updateRaceTypeVisibility();
  }
}

function updateRaceTypeVisibility() {
  const raceType = document.querySelector('input[name="race_type"]:checked').value;
  const dropdown = document.getElementById("marathon-dropdown");
  const customField = document.getElementById("custom-marathon-field");

  if (raceType === "known") {
    dropdown.style.display = "block";
    customField.style.display = "none";
  } else {
    dropdown.style.display = "none";
    customField.style.display = "block";
  }
}

document.querySelectorAll('input[name="distance"]').forEach(r => {
  r.addEventListener("change", updateFormForDistance);
});

document.querySelectorAll('input[name="race_type"]').forEach(r => {
  r.addEventListener("change", updateRaceTypeVisibility);
});

updateFormForDistance();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  localStorage.setItem("lastFormData", JSON.stringify(data));
  await generatePlan(data);
});

async function generatePlan(data) {
  submitBtn.disabled = true;
  loadingEl.style.display = "block";
  errorEl.style.display = "none";
  resultSection.style.display = "none";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate plan");
    }

    const result = await res.json();

    if (result.marathon) {
      courseNotes.style.display = "block";
      courseNotes.innerHTML = `
        <h3>${result.marathon.name}</h3>
        <p><strong>Elevation:</strong> ${result.marathon.elevation}</p>
        <p><strong>Character:</strong> ${result.marathon.character}</p>
        <p><strong>Coaching focus:</strong> ${result.marathon.coaching}</p>
      `;
    } else {
      courseNotes.style.display = "none";
    }

    // MODIFIÉ ICI : On utilise marked pour convertir le texte en tableau HTML
    planOutput.innerHTML = marked.parse(result.plan);
    
    // On garde le texte brut en mémoire pour les boutons Copy / Download
    planOutput.dataset.rawText = result.plan;

    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    errorEl.textContent = "Error: " + err.message;
    errorEl.style.display = "block";
  } finally {
    loadingEl.style.display = "none";
    submitBtn.disabled = false;
  }
}

document.getElementById("copy-btn").addEventListener("click", async () => {
  const text = planOutput.dataset.rawText || planOutput.textContent;
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById("copy-btn").textContent = "Copied!";
    setTimeout(() => {
      document.getElementById("copy-btn").textContent = "Copy";
    }, 1500);
  } catch {
    alert("Copy failed. Please select and copy manually.");
  }
});

document.getElementById("download-btn").addEventListener("click", () => {
  const text = planOutput.dataset.rawText || planOutput.textContent;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "training-plan.txt";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("regenerate-btn").addEventListener("click", async () => {
  const saved = localStorage.getItem("lastFormData");
  if (saved) {
    await generatePlan(JSON.parse(saved));
  }
});