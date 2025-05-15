document.addEventListener("DOMContentLoaded", () => {
    const seriesSelect = document.getElementById("series-select");
    const gameContainer = document.getElementById("game-container");
    const propertiesTableBody = document.getElementById("properties-table-body");
    const guessInput = document.getElementById("guess-input");
    const guessButton = document.getElementById("guess-button");
    const suggestionsContainer = document.getElementById("suggestions-container");
    const attemptsList = document.getElementById("attempts-list");
    const winMessage = document.getElementById("win-message");
    const correctCharacterName = document.getElementById("correct-character-name");
    const correctCharacterImage = document.getElementById("correct-character-image");
    const playAgainButton = document.getElementById("play-again-button");

    let allCharactersData = [];
    let currentGameSeriesCharacters = [];
    let targetCharacter = null;
    let attempts = 0;

    const MAX_ATTEMPTS = 8; // Or any other limit

    // Define properties to compare and their display names
    const PROPERTIES_CONFIG = {
        "gender": { displayName: "Género", type: "exact" },
        "species": { displayName: "Especie", type: "exact" },
        "hair_color": { displayName: "Color de Pelo", type: "exact" },
        "eye_color": { displayName: "Color de Ojos", type: "exact" },
        "affiliation": { displayName: "Afiliación(es)", type: "array" },
        "main_power": { displayName: "Poder Principal", type: "exact" } // Derived property
    };

    async function loadCharacterData() {
        try {
            const response = await fetch("characters_data.json");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allCharactersData = await response.json();
            // Pre-process data to add main_power
            allCharactersData = allCharactersData.map(char => {
                let mainPower = "N/A";
                if (char.quirk) {
                    mainPower = Array.isArray(char.quirk) ? char.quirk[0] : char.quirk;
                } else if (char.magic_type) {
                    mainPower = Array.isArray(char.magic_type) ? char.magic_type[0] : char.magic_type;
                } else if (char.abilities && char.abilities.length > 0) {
                    mainPower = char.abilities[0];
                }
                return { ...char, main_power: mainPower }; 
            });
            console.log("Character data loaded and pre-processed.");
        } catch (error) {
            console.error("Error loading character data:", error);
            gameContainer.innerHTML = "<p>Error al cargar los datos de los personajes. Por favor, inténtalo de nuevo más tarde.</p>";
            gameContainer.style.display = "block";
        }
    }

    function startGame(seriesName) {
        if (!seriesName) {
            gameContainer.style.display = "none";
            return;
        }
        currentGameSeriesCharacters = allCharactersData.filter(char => char.series === seriesName);
        if (currentGameSeriesCharacters.length === 0) {
            alert("No hay personajes para esta serie.");
            gameContainer.style.display = "none";
            return;
        }
        targetCharacter = currentGameSeriesCharacters[Math.floor(Math.random() * currentGameSeriesCharacters.length)];
        attempts = 0;
        
        console.log("Target Character:", targetCharacter.name);

        resetGameUI();
        populatePropertiesTableShell();
        gameContainer.style.display = "block";
        winMessage.style.display = "none";
        guessInput.disabled = false;
        guessButton.disabled = false;
    }

    function resetGameUI() {
        propertiesTableBody.innerHTML = "";
        attemptsList.innerHTML = "";
        guessInput.value = "";
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
    }

    function populatePropertiesTableShell() {
        propertiesTableBody.innerHTML = ""; // Clear previous
        for (const key in PROPERTIES_CONFIG) {
            const row = propertiesTableBody.insertRow();
            row.insertCell().textContent = PROPERTIES_CONFIG[key].displayName;
            row.insertCell().textContent = "-"; // Placeholder for guessed value
            row.insertCell().textContent = "-"; // Placeholder for result
        }
    }
    
    function handleGuessInput() {
        const inputValue = guessInput.value.toLowerCase();
        suggestionsContainer.innerHTML = "";
        if (inputValue.length < 2) {
            suggestionsContainer.style.display = "none";
            return;
        }

        const filteredSuggestions = currentGameSeriesCharacters.filter(char => 
            char.name.toLowerCase().includes(inputValue)
        );

        if (filteredSuggestions.length > 0) {
            filteredSuggestions.slice(0, 5).forEach(char => {
                const div = document.createElement("div");
                div.textContent = char.name;
                div.classList.add("suggestion-item");
                div.addEventListener("click", () => {
                    guessInput.value = char.name;
                    suggestionsContainer.innerHTML = "";
                    suggestionsContainer.style.display = "none";
                });
                suggestionsContainer.appendChild(div);
            });
            suggestionsContainer.style.display = "block";
        } else {
            suggestionsContainer.style.display = "none";
        }
    }

    function processGuess() {
        const guessedName = guessInput.value.trim();
        if (!guessedName) return;

        const guessedCharacter = currentGameSeriesCharacters.find(char => char.name.toLowerCase() === guessedName.toLowerCase());

        if (!guessedCharacter) {
            alert("Personaje no encontrado en la serie actual. Elige de las sugerencias o verifica el nombre.");
            return;
        }

        attempts++;
        logAttempt(guessedCharacter);
        updatePropertiesTable(guessedCharacter);
        guessInput.value = "";
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";

        if (guessedCharacter.name === targetCharacter.name) {
            displayWinState();
        } else if (attempts >= MAX_ATTEMPTS) {
            displayLossState();
        }
    }

    function logAttempt(guessedChar) {
        const li = document.createElement("li");
        li.textContent = `Intento ${attempts}: ${guessedChar.name}`;
        if (guessedChar.name === targetCharacter.name) {
            li.classList.add("correct-guess-log");
        }
        attemptsList.appendChild(li);
    }

    function updatePropertiesTable(guessedCharacter) {
        propertiesTableBody.innerHTML = ""; // Clear previous state or update rows

        for (const key in PROPERTIES_CONFIG) {
            const config = PROPERTIES_CONFIG[key];
            const guessedValue = guessedCharacter[key];
            const targetValue = targetCharacter[key];

            const row = propertiesTableBody.insertRow();
            row.insertCell().textContent = config.displayName;
            
            let displayGuessedValue = Array.isArray(guessedValue) ? guessedValue.join(", ") : guessedValue;
            if (displayGuessedValue === undefined || displayGuessedValue === null || displayGuessedValue === "") displayGuessedValue = "N/A";
            row.insertCell().textContent = displayGuessedValue;

            const comparisonCell = row.insertCell();
            let resultClass = "incorrect";
            let resultSymbol = "❌";

            if (config.type === "exact") {
                if (String(guessedValue).toLowerCase() === String(targetValue).toLowerCase()) {
                    resultClass = "correct";
                    resultSymbol = "✅";
                }
            } else if (config.type === "array") {
                const gArray = Array.isArray(guessedValue) ? guessedValue.map(v => String(v).toLowerCase()) : [];
                const tArray = Array.isArray(targetValue) ? targetValue.map(v => String(v).toLowerCase()) : [];
                
                const commonElements = gArray.filter(v => tArray.includes(v));
                
                if (gArray.length === tArray.length && commonElements.length === gArray.length && gArray.every(v => tArray.includes(v))) {
                    resultClass = "correct";
                    resultSymbol = "✅";
                } else if (commonElements.length > 0) {
                    resultClass = "partial";
                    resultSymbol = `🟡 (${commonElements.length}/${tArray.length})`;
                }
                 // Add arrows for array length comparison
                if (gArray.length < tArray.length) resultSymbol += " ⬆️";
                if (gArray.length > tArray.length) resultSymbol += " ⬇️";
            }
            comparisonCell.textContent = resultSymbol;
            comparisonCell.className = resultClass;
        }
    }

    function displayWinState() {
        winMessage.style.display = "block";
        correctCharacterName.textContent = targetCharacter.name;
        if (targetCharacter.image_url) {
            correctCharacterImage.src = targetCharacter.image_url;
            correctCharacterImage.style.display = "block";
        } else {
            correctCharacterImage.style.display = "none";
        }
        guessInput.disabled = true;
        guessButton.disabled = true;
    }

    function displayLossState() {
        alert(`¡Has alcanzado el máximo de ${MAX_ATTEMPTS} intentos! El personaje era ${targetCharacter.name}.`);
        winMessage.style.display = "block"; // Show the answer even on loss
        correctCharacterName.textContent = `${targetCharacter.name} (No adivinado)`;
        if (targetCharacter.image_url) {
            correctCharacterImage.src = targetCharacter.image_url;
            correctCharacterImage.style.display = "block";
        } else {
            correctCharacterImage.style.display = "none";
        }
        guessInput.disabled = true;
        guessButton.disabled = true;
    }

    // Event Listeners
    seriesSelect.addEventListener("change", (e) => {
        startGame(e.target.value);
    });

    guessButton.addEventListener("click", processGuess);
    guessInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            processGuess();
        }
    });
    guessInput.addEventListener("input", handleGuessInput);
    
    playAgainButton.addEventListener("click", () => {
        startGame(seriesSelect.value); // Restart with the same series
    });

    // Initial Load
    loadCharacterData();
});

