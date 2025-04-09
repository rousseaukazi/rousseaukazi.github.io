// Global variables
let scene, camera, renderer, controls;
let clock;
let ball, net;
let pig, pigMixer, pigAnimations;
let duck, duckMixer, duckAnimations;
let showBall = true;
let showPig = true;
let showDuck = true;
let showNet = true;

// Default positions
const pigPosition = new THREE.Vector3(0, 0, -3.90);
const ballPosition = new THREE.Vector3(-0.80, 0, -1.5);
const duckPosition = new THREE.Vector3(-2.90, 0, 4.30);
const netPosition = new THREE.Vector3(-0.8, 0, 3); // Keep net position the same

// Ball animation variables
let ballAnimating = false;
let ballAnimationStartTime = 0;
let ballAnimationDuration = 1200; // 1.2 seconds for a smoother arc
let ballStartPosition = new THREE.Vector3(-0.80, 0, -1.5);
let ballEndPosition = new THREE.Vector3(-0.8, 0, 2.6);
let ballAnimationCompleted = false;
let ballMaxHeight = 1.5; // Slightly lower maximum height for a smoother arc

// Add these global variables for action sequence
let actionSequenceRunning = false;
let actionSequenceStartTime = 0;
let pigAnimationStarted = false;
let duckReactionStarted = false;

// Add these global variables for animation control
let pigKickAction = null;
let duckReactAction = null;

// Action sequence timing with immediate pig reaction (in milliseconds)
const pigAnimTime = 0;      // Pig animation starts immediately
const ballKickTime = 800;   // Ball is kicked after 0.8 seconds
const duckReactTime = 1300; // Duck reacts after 1.3 seconds
const sequenceEndTime = 3000; // Sequence ends after 3 seconds

// Store the default camera position and target
const defaultCameraPosition = new THREE.Vector3(-9.22, 1.39, -3.65);
const defaultCameraTarget = new THREE.Vector3(0, 1, 0);

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera with updated settings
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(defaultCameraTarget);
    
    // Create renderer with improved settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x64B5F6); // Light blue
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding; // Improved color rendering
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
    renderer.toneMappingExposure = 1.2; // Brighter exposure
    renderer.setPixelRatio(window.devicePixelRatio); // Use device pixel ratio for sharper rendering
    document.body.appendChild(renderer.domElement);
    
    // Create controls with restricted movement
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.copy(defaultCameraTarget);
    
    // Restrict controls to only allow rotation (no zoom or tilt)
    controls.enableZoom = false;      // Disable zooming
    controls.minPolarAngle = Math.PI / 2; // Restrict to horizontal rotation only
    controls.maxPolarAngle = Math.PI / 2; // Restrict to horizontal rotation only
    
    controls.update();
    
    // Create clock for animations
    clock = new THREE.Clock();
    
    // Create scene elements
    createCartoonySky(); // Add the cartoony sky with double clouds
    createCarpetFloor(); // Create carpet floor instead of grass
    createLights();
    createWelcomeButton(); // Add the welcome button
    
    // Load models
    loadPigModel();
    loadDuckModel();
    loadBallModel();
    loadNetModel();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    
    // Add click/tap event listener
    window.addEventListener('click', handleClick);
    // Add touch event for mobile
    window.addEventListener('touchend', function(event) {
        // Convert touch to click event
        const touch = event.changedTouches[0];
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleClick(clickEvent);
    });
    
    // Start animation loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Get delta time
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update controls
    controls.update();
    
    // Update animations
    if (pigMixer) pigMixer.update(delta);
    if (duckMixer) duckMixer.update(delta);
    
    // Update clouds to always face camera and float
    scene.children.forEach(child => {
        if (child.name && child.name.startsWith('cloud_')) {
            // Make cloud always face camera
            child.lookAt(camera.position);
            
            // Apply floating animation
            if (child.userData) {
                const floatY = Math.sin((elapsedTime + child.userData.startTime) * child.userData.speed) 
                    * child.userData.amplitude * child.userData.direction;
                child.position.y = child.userData.startY + floatY;
            }
        }
        
        // Update welcome button
        if (child.name === 'welcomeButton') {
            // Make button always face camera
            child.lookAt(camera.position);
            
            // Apply floating animation
            if (child.userData) {
                const floatY = Math.sin(elapsedTime * child.userData.speed) 
                    * child.userData.amplitude;
                child.position.y = child.userData.startY + floatY;
                
                // Apply pulsing effect
                if (child.userData.timeline && child.userData.timeline.pulsing) {
                    child.userData.timeline.time += delta * 1000;
                    if (child.userData.timeline.time > child.userData.timeline.duration) {
                        child.userData.timeline.time = 0;
                    }
                    
                    const progress = child.userData.timeline.time / child.userData.timeline.duration;
                    const scale = child.userData.timeline.startScale + 
                        (child.userData.timeline.endScale - child.userData.timeline.startScale) * 
                        (0.5 - 0.5 * Math.cos(progress * Math.PI * 2));
                    
                    child.scale.set(scale, scale, 1);
                }
            }
        }
    });
    
    // Update ball animation if active
    if (ballAnimating) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - ballAnimationStartTime;
        const progress = Math.min(elapsedTime / ballAnimationDuration, 1.0);
        
        // Use a simple sine function for a smooth arc
        // sin(π * t) gives a smooth curve from 0 to 0 with a peak in the middle
        const heightProgress = Math.sin(Math.PI * progress);
        const height = ballMaxHeight * heightProgress;
        
        // Simple linear interpolation for horizontal movement
        const currentPosition = new THREE.Vector3();
        currentPosition.x = ballStartPosition.x; // Keep X the same
        currentPosition.z = ballStartPosition.z + (ballEndPosition.z - ballStartPosition.z) * progress;
        currentPosition.y = height;
        
        // Update ball position
        ball.position.copy(currentPosition);
        
        // Simpler rotation - just roll forward at a constant rate
        ball.rotation.x -= 0.08;
        
        // Check if animation is complete
        if (progress >= 1.0) {
            ballAnimating = false;
            ballAnimationCompleted = true;
            console.log("Ball animation completed");
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // In your animate function, add this line:
    updateButtons(clock.getDelta());
}

// Load the pig model with updated position and default animation
function loadPigModel() {
    const loader = new THREE.GLTFLoader();

    loader.load(
        './models/pig2.glb',
        function (gltf) {
            const model = gltf.scene;
            
            // Center the model
            model.position.copy(pigPosition); // Use the default position
            
            // Enable shadows for the model
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                        node.material.roughness = 0.5;
                        node.material.metalness = 0.2;
                    }
                }
            });
            
            scene.add(model);
            
            // Store the model and animations globally
            pig = model;
            pigAnimations = gltf.animations;
            pigMixer = new THREE.AnimationMixer(model);
            
            // Log available animations to help with debugging
            console.log('Available animations:', pigAnimations.map(a => a.name));
            
            // Find the idle/stand animation
            let idleAnimIndex = 0;
            for (let i = 0; i < pigAnimations.length; i++) {
                const animName = pigAnimations[i].name.toLowerCase();
                if (animName.includes('idle') || (animName.includes('stand') && !animName.includes('standup'))) {
                    idleAnimIndex = i;
                    break;
                }
            }

            console.log("LOOK AT ME:",pigAnimations[0]);
            
            // Play the idle animation
            const idleAction = pigMixer.clipAction(pigAnimations[idleAnimIndex]);
            idleAction.play();
            
            // Update the active animation text
            updateActiveAnimationText(pigAnimations[idleAnimIndex].name);
            
            // Update animations control panel
            updateAnimationsControlPanel();
            
            console.log(`Pig model loaded and playing idle animation: ${pigAnimations[idleAnimIndex].name}`);
        },
        undefined,
        function (error) {
            console.error('An error occurred loading the model:', error);
        }
    );
}

// Load the duck model with updated position, rotation, and default animation
function loadDuckModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/duck.glb',
        function (gltf) {
            // Store the model
            duck = gltf.scene;
            
            // Enable shadows and improve materials
            duck.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model using the default position
            duck.position.copy(duckPosition);
            
            // Rotate 180 degrees on Y axis to face the other way
            duck.rotation.y = Math.PI; // 180 degrees in radians
            
            // Set visibility based on toggle
            duck.visible = showDuck;
            
            // Add to scene
            scene.add(duck);
            
            // Store animations
            duckAnimations = gltf.animations;

            console.log("LOOK AT ME:",duckAnimations);
            
            // Create animation mixer
            duckMixer = new THREE.AnimationMixer(duck);
            
            // Find and play the "stand" animation by default
            if (duckAnimations.length > 0) {
                // Look for an animation named "stand" or similar
                let standAnimIndex = 0; // Default to first animation
                
                for (let i = 0; i < duckAnimations.length; i++) {
                    const animName = duckAnimations[i].name.toLowerCase();
                    if (animName.includes('stand') || animName.includes('idle')) {
                        standAnimIndex = i;
                        break;
                    }
                }
                
                // Play the stand animation
                const action = duckMixer.clipAction(duckAnimations[standAnimIndex]);
                action.play();
                
                // Update the active animation text
                updateActiveDuckAnimationText(duckAnimations[standAnimIndex].name);
                
                // Update animations control panel
                updateDuckAnimationsControlPanel();
                
                console.log(`Playing duck animation: ${duckAnimations[standAnimIndex].name}`);
            }
            
            console.log("Duck model loaded at position", duckPosition, "and rotated 180 degrees");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the duck model', error);
        }
    );
}

// Load the ball model
function loadBallModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/ball.glb',
        function (gltf) {
            // Store the model
            ball = gltf.scene;
            
            // Enable shadows and improve materials
            ball.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model
            ball.position.copy(ballStartPosition);
            
            // Scale down by another 25% from current size (0.36 * 0.75 = 0.27)
            ball.scale.set(0.27, 0.27, 0.27);
            
            // Set visibility based on toggle
            ball.visible = showBall;
            
            // Add to scene
            scene.add(ball);
            
            console.log("Ball model loaded at reduced scale (0.27)");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the ball model', error);
            // Fallback to simple ball if model fails to load
            createSimpleBall();
        }
    );
}

// Load the net model
function loadNetModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/net.glb',
        function (gltf) {
            // Store the model
            net = gltf.scene;
            
            // Enable shadows and improve materials
            net.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model
            net.position.set(-.5, 0, 6); // Adjust position as needed
            
            // Rotate 180 degrees on Y axis to face the correct direction
            net.rotation.y = Math.PI; // 180 degrees in radians
            
            // Scale to 1.5x and then another 25% (1.5 * 1.25 = 1.875)
            net.scale.set(1.875, 1.875, 1.875);
            
            // Set visibility based on toggle
            net.visible = showNet;
            
            // Add to scene
            scene.add(net);
            
            console.log("Net model loaded at 1.875x scale");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the net model', error);
            // Fallback to simple net if model fails to load
            createSoccerNet();
        }
    );
}

// Update animations control panel
function updateAnimationsControlPanel() {
    // If there are no animations, return
    if (!pigAnimations || pigAnimations.length === 0) {
        return;
    }
    
    // Remove all control panel updates
    console.log("Pig animations loaded");
}

// Update duck animations control panel
function updateDuckAnimationsControlPanel() {
    // If there are no animations, return
    if (!duckAnimations || duckAnimations.length === 0) {
        return;
    }
    
    // Remove all control panel updates
    console.log("Duck animations loaded");
}

// Function to update the active pig animation text
function updateActiveAnimationText(animationName) {
    // Remove control panel updates
    console.log(`Active pig animation: ${animationName}`);
}

// Function to update the active duck animation text
function updateActiveDuckAnimationText(animationName) {
    // Remove control panel updates
    console.log(`Active duck animation: ${animationName}`);
}

// Handle keyboard input
function onKeyDown(event) {
    // Check if key is spacebar for resetting camera
    if (event.code === 'Space') {
        resetCameraPosition();
        return;
    }
    
    // Check if key is 'b' for toggling ball visibility
    if (event.key.toLowerCase() === 'b') {
        showBall = !showBall;
        if (ball) ball.visible = showBall;
        console.log(`Ball visibility: ${showBall ? 'shown' : 'hidden'}`);
        
        // Remove UI update
        // updateToggleState('Ball', showBall);
    }
    
    // Check if key is 'p' for toggling pig visibility
    if (event.key.toLowerCase() === 'p') {
        showPig = !showPig;
        if (pig) pig.visible = showPig;
        console.log(`Pig visibility: ${showPig ? 'shown' : 'hidden'}`);
        
        // Remove UI update
        // updateToggleState('Pig', showPig);
    }
    
    // Check if key is 'd' for toggling duck visibility
    if (event.key.toLowerCase() === 'd') {
        showDuck = !showDuck;
        if (duck) duck.visible = showDuck;
        console.log(`Duck visibility: ${showDuck ? 'shown' : 'hidden'}`);
        
        // Remove UI update
        // updateToggleState('Duck', showDuck);
    }
    
    // Check if key is 'n' for toggling net visibility
    if (event.key.toLowerCase() === 'n') {
        showNet = !showNet;
        if (net) net.visible = showNet;
        console.log(`Net visibility: ${showNet ? 'shown' : 'hidden'}`);
        
        // Remove UI update
        // updateToggleState('Net', showNet);
    }
    
    // Check if key is 'k' for kicking the ball
    if (event.key.toLowerCase() === 'k') {
        // Only allow kicking if ball is visible and not already animating
        if (ball && ball.visible && !ballAnimating) {
            kickBall();
        }
    }
    
    // Check if key is 's' for starting the action sequence
    if (event.key.toLowerCase() === 's') {
        // Hide the welcome button when starting the action
        scene.children.forEach(child => {
            if (child.name === 'welcomeButton') {
                // Fade out animation
                const fadeOutDuration = 1000; // 1 second
                const startTime = Date.now();
                
                function fadeOut() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / fadeOutDuration, 1);
                    
                    if (child.material) {
                        child.material.opacity = 1 - progress;
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(fadeOut);
                    } else {
                        child.visible = false;
                    }
                }
                
                fadeOut();
            }
        });
        
        startActionSequence();
    }
    
    // Check if key is '1' through '5' for pig animations
    if (event.key >= '1' && event.key <= '5' && pigAnimations && pigMixer) {
        const index = parseInt(event.key) - 1;
        if (index < pigAnimations.length) {
            // Stop any current animations
            pigMixer.stopAllAction();
            
            // Play the selected animation
            const action = pigMixer.clipAction(pigAnimations[index]);
            action.reset();
            action.play();
            
            // Update the active animation text
            updateActiveAnimationText(pigAnimations[index].name);
            
            console.log(`Playing pig animation: ${pigAnimations[index].name} (index ${index})`);
        }
    }
    
    // Check for duck animation keys (q-t)
    const duckAnimKeys = {'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4};
    if (duckAnimKeys.hasOwnProperty(event.key.toLowerCase()) && duckAnimations && duckMixer) {
        const index = duckAnimKeys[event.key.toLowerCase()];
        if (index < duckAnimations.length) {
            // Stop any current animations
            duckMixer.stopAllAction();
            
            // Play the selected animation
            const action = duckMixer.clipAction(duckAnimations[index]);
            action.play();
            
            // Update the active animation text
            updateActiveDuckAnimationText(duckAnimations[index].name);
            
            console.log(`Playing duck animation: ${duckAnimations[index].name}`);
        }
    }
    
    // Check if key is 'r' for resetting the scene
    if (event.key.toLowerCase() === 'r') {
        resetScene();
    }
}

// Create a simple control panel
function createControlsPanel() {
    // Create container
    controlsInfo = document.createElement('div');
    controlsInfo.style.position = 'absolute';
    controlsInfo.style.top = '15px';
    controlsInfo.style.right = '15px';
    controlsInfo.style.backgroundColor = 'rgba(33, 33, 33, 0.85)';
    controlsInfo.style.color = '#e0e0e0';
    controlsInfo.style.padding = '12px';
    controlsInfo.style.borderRadius = '8px';
    controlsInfo.style.fontFamily = "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
    controlsInfo.style.fontSize = '13px';
    controlsInfo.style.userSelect = 'none';
    controlsInfo.style.zIndex = '1000';
    controlsInfo.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    controlsInfo.style.backdropFilter = 'blur(5px)';
    controlsInfo.style.display = 'none'; // Hidden by default
    
    // Create header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    header.style.paddingBottom = '8px';
    
    const title = document.createElement('div');
    title.textContent = 'Controls';
    title.style.fontWeight = '500';
    title.style.letterSpacing = '0.5px';
    title.style.fontSize = '14px';
    
    header.appendChild(title);
    
    // Create content container
    const content = document.createElement('div');
    content.id = 'controls-content';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';
    
    // Create visibility toggles section
    const togglesSection = document.createElement('div');
    togglesSection.style.display = 'flex';
    togglesSection.style.flexWrap = 'wrap';
    togglesSection.style.gap = '8px';
    
    // Create toggle for ball
    const ballToggle = createToggle('Ball', showBall, function(checked) {
        showBall = checked;
        if (ball) ball.visible = checked;
    });
    
    // Create toggle for pig
    const pigToggle = createToggle('Pig', showPig, function(checked) {
        showPig = checked;
        if (pig) pig.visible = checked;
    });
    
    // Create toggle for duck
    const duckToggle = createToggle('Duck', showDuck, function(checked) {
        showDuck = checked;
        if (duck) duck.visible = checked;
    });
    
    // Create toggle for net
    const netToggle = createToggle('Net', showNet, function(checked) {
        showNet = checked;
        if (net) net.visible = checked;
    });
    
    togglesSection.appendChild(ballToggle);
    togglesSection.appendChild(pigToggle);
    togglesSection.appendChild(duckToggle);
    togglesSection.appendChild(netToggle);
    
    // Create hotkeys table
    const hotkeysTable = document.createElement('table');
    hotkeysTable.id = 'hotkeys-table';
    hotkeysTable.style.width = '100%';
    hotkeysTable.style.borderCollapse = 'collapse';
    hotkeysTable.style.marginTop = '8px';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    
    const keyHeader = document.createElement('th');
    keyHeader.textContent = 'Key';
    keyHeader.style.textAlign = 'left';
    keyHeader.style.padding = '4px 8px';
    keyHeader.style.fontWeight = '500';
    
    const descHeader = document.createElement('th');
    descHeader.textContent = 'Action';
    descHeader.style.textAlign = 'left';
    descHeader.style.padding = '4px 8px';
    descHeader.style.fontWeight = '500';
    
    headerRow.appendChild(keyHeader);
    headerRow.appendChild(descHeader);
    thead.appendChild(headerRow);
    hotkeysTable.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Define hotkeys
    const hotkeys = [
        { key: 'B', description: 'Toggle ball visibility' },
        { key: 'P', description: 'Toggle pig visibility' },
        { key: 'D', description: 'Toggle duck visibility' },
        { key: 'N', description: 'Toggle net visibility' },
        { key: 'K', description: 'Kick the ball' },
        { key: 'S', description: 'Start action sequence' },
        { key: 'M', description: 'Toggle controls panel' }
    ];
    
    hotkeys.forEach((hotkey, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = index < hotkeys.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none';
        
        const keyCell = document.createElement('td');
        keyCell.style.padding = '4px 8px';
        
        const keySpan = document.createElement('span');
        keySpan.textContent = hotkey.key;
        keySpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        keySpan.style.borderRadius = '3px';
        keySpan.style.padding = '2px 5px';
        keySpan.style.fontFamily = 'monospace';
        keySpan.style.fontSize = '11px';
        
        keyCell.appendChild(keySpan);
        
        const descCell = document.createElement('td');
        descCell.textContent = hotkey.description;
        descCell.style.padding = '4px 8px';
        
        row.appendChild(keyCell);
        row.appendChild(descCell);
        tbody.appendChild(row);
    });
    
    hotkeysTable.appendChild(tbody);
    
    // Add sections to content
    content.appendChild(togglesSection);
    
    const tableTitle = document.createElement('div');
    tableTitle.textContent = 'Hotkeys';
    tableTitle.style.fontWeight = '500';
    tableTitle.style.marginTop = '4px';
    tableTitle.style.fontSize = '13px';
    content.appendChild(tableTitle);
    
    content.appendChild(hotkeysTable);
    
    // Add header and content to container
    controlsInfo.appendChild(header);
    controlsInfo.appendChild(content);
    
    // Add to document
    document.body.appendChild(controlsInfo);
    
    console.log("Controls panel created (press 'M' to show)");
}

// Create a toggle switch
function createToggle(label, initialState, onChange) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    
    // Create the toggle switch
    const toggleContainer = document.createElement('div');
    toggleContainer.style.position = 'relative';
    toggleContainer.style.width = '36px';
    toggleContainer.style.height = '20px';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialState;
    checkbox.style.opacity = '0';
    checkbox.style.width = '0';
    checkbox.style.height = '0';
    
    const slider = document.createElement('div');
    slider.style.position = 'absolute';
    slider.style.cursor = 'pointer';
    slider.style.top = '0';
    slider.style.left = '0';
    slider.style.right = '0';
    slider.style.bottom = '0';
    slider.style.backgroundColor = initialState ? '#4CAF50' : '#ccc';
    slider.style.transition = '.4s';
    slider.style.borderRadius = '34px';
    
    const knob = document.createElement('div');
    knob.style.position = 'absolute';
    knob.style.content = '""';
    knob.style.height = '16px';
    knob.style.width = '16px';
    knob.style.left = initialState ? '18px' : '2px';
    knob.style.bottom = '2px';
    knob.style.backgroundColor = 'white';
    knob.style.transition = '.4s';
    knob.style.borderRadius = '50%';
    
    slider.appendChild(knob);
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(slider);
    
    // Create label
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    // Add elements to container
    container.appendChild(toggleContainer);
    container.appendChild(labelText);
    
    // Add event listener to slider for better click handling
    slider.addEventListener('click', function() {
        checkbox.checked = !checkbox.checked;
        slider.style.backgroundColor = checkbox.checked ? '#4CAF50' : '#ccc';
        knob.style.left = checkbox.checked ? '18px' : '2px';
        if (onChange) onChange(checkbox.checked);
    });
    
    return container;
}

// Toggle controls panel visibility
function toggleControlsPanel() {
    controlsVisible = !controlsVisible;
    controlsInfo.style.display = controlsVisible ? 'block' : 'none';
    console.log(`Controls panel ${controlsVisible ? 'shown' : 'hidden'}`);
}

// Create lights with improved settings
function createLights() {
    // Ambient light for overall scene brightness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;
    
    // Increase shadow area
    const shadowSize = 15;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    
    scene.add(directionalLight);
    
    // Add a fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 8, -7);
    scene.add(fillLight);
    
    // Add a subtle rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
    
    console.log("Enhanced lighting created");
}

// Create a smooth cartoony grass floor
function createCarpetFloor() {
    // Remove any existing floor
    scene.children.forEach(child => {
        if (child.name === 'floor') {
            scene.remove(child);
        }
    });
    
    // Create a larger texture for smoother grass
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    // Base color - bright green for cartoon grass
    const baseColor = '#7CCD5F';
    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create a gradient background to eliminate tiling edges
    const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width * 0.7
    );
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, '#6BBF53'); // Slightly darker at edges for smooth blending
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add texture and depth to the grass with very soft edges
    // Darker green patches for depth - use alpha for smoother blending
    context.fillStyle = 'rgba(94, 175, 63, 0.4)'; // #5EAF3F with alpha
    
    // Create varied grass patches with soft edges
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 50 + Math.random() * 150;
        
        // Use shadow blur for softer edges
        context.shadowColor = 'rgba(94, 175, 63, 0.4)';
        context.shadowBlur = 30;
        
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Reset shadow for next elements
    context.shadowBlur = 0;
    
    // Add lighter green highlights with soft edges
    context.fillStyle = 'rgba(144, 224, 112, 0.3)'; // #90E070 with alpha
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 40 + Math.random() * 100;
        
        // Use shadow blur for softer edges
        context.shadowColor = 'rgba(144, 224, 112, 0.3)';
        context.shadowBlur = 25;
        
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Reset shadow
    context.shadowBlur = 0;
    
    // Add very subtle noise texture across the entire surface
    for (let i = 0; i < 20000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 2;
        
        // Very subtle color variations
        const alpha = 0.05 + Math.random() * 0.1; // Very transparent
        
        // Randomly choose between slightly darker or lighter than base
        if (Math.random() > 0.5) {
            context.fillStyle = `rgba(94, 175, 63, ${alpha})`; // Darker
        } else {
            context.fillStyle = `rgba(144, 224, 112, ${alpha})`; // Lighter
        }
        
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add some small flowers for a playful touch - with soft edges
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 2 + Math.random() * 4;
        
        // Randomly choose flower colors with alpha for better blending
        const flowerType = Math.floor(Math.random() * 4);
        if (flowerType === 0) context.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White flowers
        else if (flowerType === 1) context.fillStyle = 'rgba(255, 244, 79, 0.7)'; // Yellow flowers
        else if (flowerType === 2) context.fillStyle = 'rgba(255, 151, 203, 0.7)'; // Pink flowers
        else context.fillStyle = 'rgba(167, 199, 255, 0.7)'; // Light blue flowers
        
        // Add glow effect for flowers
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 4;
        
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Create a texture from the canvas
    const grassTexture = new THREE.CanvasTexture(canvas);
    
    // Use minimal repetition and anisotropic filtering to reduce visible tiling
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(2, 2); // Much less repetition
    grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
    // Create a floor material with the grass texture
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.8, // Slightly less rough for smoother appearance
        metalness: 0.0, // Not metallic at all
        color: 0xffffff // White to let the texture show through
    });
    
    // Create a larger ground plane to reduce visible edges
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.name = 'floor';
    
    // Rotate and position the floor
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = -0.01; // Slightly below zero to avoid z-fighting
    floor.receiveShadow = true;
    
    // Add to scene
    scene.add(floor);
    
    console.log("Created smooth cartoony grass floor");
}

// Create a bright, cheerful cartoony sky with stylized clouds
function createCartoonySky() {
    // Remove any existing sky and clouds
    scene.children.forEach(child => {
        if (child.name === 'cartoonSky' || child.name.startsWith('cloud_')) {
            scene.remove(child);
        }
    });
    
    // Create a simple sky dome with a gradient
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    skyGeometry.scale(-1, 1, 1); // Flip inside out
    
    // Create a gradient material for the sky
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x64B5F6, // Light blue
        side: THREE.BackSide,
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'cartoonSky';
    scene.add(sky);
    
    // Update the renderer background color to match
    renderer.setClearColor(0x64B5F6);
    
    // Now add cartoony clouds
    addStylizedCartoonClouds();
    
    console.log("Cheerful cartoony sky created with stylized cartoon clouds");
}

// Add stylized cartoon clouds - now with twice as many!
function addStylizedCartoonClouds() {
    // Create a cloud texture with a more cartoony style
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to draw a cartoony cloud
    function drawCartoonCloud(ctx, x, y, width, height) {
        // Draw the base of the cloud
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x, y + height * 0.6);
        
        // Bottom edge with slight curves
        ctx.bezierCurveTo(
            x + width * 0.1, y + height * 0.7,
            x + width * 0.9, y + height * 0.7,
            x + width, y + height * 0.6
        );
        
        // Right side
        ctx.bezierCurveTo(
            x + width * 1.05, y + height * 0.4,
            x + width * 0.95, y + height * 0.2,
            x + width * 0.9, y + height * 0.25
        );
        
        // Top bumps (cartoony cloud puffs)
        // First puff
        ctx.bezierCurveTo(
            x + width * 0.85, y,
            x + width * 0.65, y,
            x + width * 0.6, y + height * 0.25
        );
        
        // Second puff
        ctx.bezierCurveTo(
            x + width * 0.55, y - height * 0.1,
            x + width * 0.45, y - height * 0.1,
            x + width * 0.4, y + height * 0.2
        );
        
        // Third puff
        ctx.bezierCurveTo(
            x + width * 0.35, y - height * 0.05,
            x + width * 0.25, y - height * 0.05,
            x + width * 0.2, y + height * 0.25
        );
        
        // Left side
        ctx.bezierCurveTo(
            x + width * 0.1, y + height * 0.2,
            x - width * 0.05, y + height * 0.4,
            x, y + height * 0.6
        );
        
        ctx.closePath();
        ctx.fill();
        
        // Add some highlight for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x + width * 0.25, y + height * 0.3, width * 0.15, 0, Math.PI * 2);
        ctx.arc(x + width * 0.55, y + height * 0.2, width * 0.15, 0, Math.PI * 2);
        ctx.arc(x + width * 0.75, y + height * 0.3, width * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a subtle outline for a more cartoony look
        ctx.strokeStyle = 'rgba(220, 220, 255, 0.8)';
        ctx.lineWidth = width * 0.03;
        ctx.stroke();
    }
    
    // Draw the main cloud
    drawCartoonCloud(context, 50, 100, 400, 150);
    
    // Create a texture from the canvas
    const cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.premultiplyAlpha = true;
    
    // Create a material that uses the cloud texture
    const cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    // Create cloud positions around the scene - DOUBLED!
    const cloudPositions = [
        // Original positions
        { x: 20, y: 15, z: -30, scale: 10, rotation: 0.1 },
        { x: -25, y: 18, z: -20, scale: 12, rotation: -0.2 },
        { x: 15, y: 12, z: 25, scale: 8, rotation: 0.15 },
        { x: -15, y: 20, z: 30, scale: 14, rotation: -0.1 },
        { x: 30, y: 25, z: 10, scale: 16, rotation: 0.05 },
        { x: -30, y: 15, z: -10, scale: 10, rotation: -0.15 },
        { x: 0, y: 30, z: -40, scale: 18, rotation: 0 },
        { x: -40, y: 20, z: 0, scale: 12, rotation: 0.2 },
        { x: 40, y: 18, z: 0, scale: 14, rotation: -0.05 },
        { x: 0, y: 25, z: 40, scale: 16, rotation: 0.1 },
        { x: 20, y: 35, z: 20, scale: 20, rotation: -0.1 },
        { x: -20, y: 30, z: -25, scale: 18, rotation: 0.05 },
        
        // Additional positions (doubled)
        { x: 10, y: 22, z: -35, scale: 11, rotation: -0.15 },
        { x: -35, y: 16, z: -15, scale: 13, rotation: 0.1 },
        { x: 25, y: 14, z: 15, scale: 9, rotation: -0.2 },
        { x: -5, y: 18, z: 35, scale: 15, rotation: 0.05 },
        { x: 35, y: 28, z: 5, scale: 17, rotation: -0.1 },
        { x: -20, y: 13, z: -5, scale: 11, rotation: 0.2 },
        { x: 5, y: 35, z: -30, scale: 19, rotation: -0.05 },
        { x: -30, y: 22, z: 10, scale: 13, rotation: -0.15 },
        { x: 30, y: 16, z: -10, scale: 15, rotation: 0.1 },
        { x: 10, y: 28, z: 30, scale: 17, rotation: -0.05 },
        { x: 15, y: 38, z: 15, scale: 21, rotation: 0.15 },
        { x: -15, y: 33, z: -20, scale: 19, rotation: -0.1 }
    ];
    
    // Create cloud billboards
    cloudPositions.forEach((pos, index) => {
        // Create a plane for the cloud
        const cloudGeometry = new THREE.PlaneGeometry(1, 0.5); // Aspect ratio matches our texture
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
        
        // Position and scale the cloud
        cloud.position.set(pos.x, pos.y, pos.z);
        cloud.scale.set(pos.scale, pos.scale, 1);
        cloud.name = `cloud_${index}`;
        
        // Make the cloud always face the camera but with a slight rotation for variety
        cloud.lookAt(camera.position);
        cloud.rotation.z = pos.rotation;
        
        // Add to scene
        scene.add(cloud);
        
        // Add a simple animation to make the cloud float
        const speed = 0.0005 + Math.random() * 0.001; // Slower, gentler movement
        const direction = Math.random() > 0.5 ? 1 : -1;
        const amplitude = 0.3 + Math.random() * 0.7; // Smaller amplitude for subtle movement
        const startY = pos.y;
        
        // Store animation properties on the cloud object
        cloud.userData = {
            speed: speed,
            direction: direction,
            amplitude: amplitude,
            startY: startY,
            startTime: Math.random() * 1000 // Random start time for varied movement
        };
    });
    
    console.log("Added double the stylized cartoon clouds");
}

// Create a simple ball (fallback)
function createSimpleBall() {
    const ballGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1
    });
    
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.copy(ballStartPosition);
    ball.visible = showBall;
    
    scene.add(ball);
    
    console.log("Simple ball created as fallback");
}

// Create a soccer net
function createSoccerNet() {
    // Create the frame
    const frameGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    // Create the net group
    net = new THREE.Group();
    
    // Create the back of the net
    const backWidth = 2;
    const backHeight = 1.2;
    
    // Create the back frame
    const backFrame = new THREE.Group();
    
    // Bottom bar
    const bottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    bottomBar.position.set(0, 0, 0);
    backFrame.add(bottomBar);
    
    // Top bar
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    topBar.position.set(0, backHeight, 0);
    backFrame.add(topBar);
    
    // Left bar
    const leftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    leftBar.position.set(-backWidth/2, backHeight/2, 0);
    backFrame.add(leftBar);
    
    // Right bar
    const rightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    rightBar.position.set(backWidth/2, backHeight/2, 0);
    backFrame.add(rightBar);
    
    // Add back frame to net
    net.add(backFrame);
    
    // Create the sides
    const sideDepth = 0.8;
    
    // Left side frame
    const leftSideFrame = new THREE.Group();
    
    // Bottom bar
    const leftBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    leftBottomBar.position.set(-backWidth/2, 0, sideDepth/2);
    leftSideFrame.add(leftBottomBar);
    
    // Top bar
    const leftTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    leftTopBar.position.set(-backWidth/2, backHeight, sideDepth/2);
    leftSideFrame.add(leftTopBar);
    
    // Front bar
    const leftFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    leftFrontBar.position.set(-backWidth/2, backHeight/2, sideDepth);
    leftSideFrame.add(leftFrontBar);
    
    // Add left side frame to net
    net.add(leftSideFrame);
    
    // Right side frame
    const rightSideFrame = new THREE.Group();
    
    // Bottom bar
    const rightBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    rightBottomBar.position.set(backWidth/2, 0, sideDepth/2);
    rightSideFrame.add(rightBottomBar);
    
    // Top bar
    const rightTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    rightTopBar.position.set(backWidth/2, backHeight, sideDepth/2);
    rightSideFrame.add(rightTopBar);
    
    // Front bar
    const rightFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    rightFrontBar.position.set(backWidth/2, backHeight/2, sideDepth);
    rightSideFrame.add(rightFrontBar);
    
    // Add right side frame to net
    net.add(rightSideFrame);
    
    // Create the top
    const topFrame = new THREE.Group();
    
    // Left bar
    const topLeftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    topLeftBar.position.set(-backWidth/2, backHeight, sideDepth/2);
    topFrame.add(topLeftBar);
    
    // Right bar
    const topRightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    topRightBar.position.set(backWidth/2, backHeight, sideDepth/2);
    topFrame.add(topRightBar);
    
    // Front bar
    const topFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    topFrontBar.position.set(0, backHeight, sideDepth);
    topFrame.add(topFrontBar);
    
    // Add top frame to net
    net.add(topFrame);
    
    // Create the front frame
    const frontFrame = new THREE.Group();
    
    // Bottom bar
    const frontBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    frontBottomBar.position.set(0, 0, sideDepth);
    frontFrame.add(frontBottomBar);
    
    // Left bar
    const frontLeftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    frontLeftBar.position.set(-backWidth/2, backHeight/2, sideDepth);
    frontFrame.add(frontLeftBar);
    
    // Right bar
    const frontRightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    frontRightBar.position.set(backWidth/2, backHeight/2, sideDepth);
    frontFrame.add(frontRightBar);
    
    // Top bar
    const frontTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    frontTopBar.position.set(0, backHeight, sideDepth);
    frontFrame.add(frontTopBar);
    
    // Add front frame to net
    net.add(frontFrame);
    
    // Position the net
    net.position.set(-0.8, 0, 3);
    
    // Add net to scene
    scene.add(net);
    
    console.log("Soccer net created");
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize when the window loads
window.onload = init;

// Function to update toggle state in the UI
function updateToggleState(label, state) {
    // Find all toggle labels in the control panel
    const toggleLabels = document.querySelectorAll('#controls-content span');
    
    // Find the matching label
    for (let i = 0; i < toggleLabels.length; i++) {
        if (toggleLabels[i].textContent === label) {
            // Get the toggle container (parent's parent)
            const toggleContainer = toggleLabels[i].parentElement;
            
            // Find the checkbox and update it
            const checkbox = toggleContainer.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = state;
                
                // Also update the slider appearance
                const slider = toggleContainer.querySelector('div > div');
                if (slider) {
                    slider.style.backgroundColor = state ? '#4CAF50' : '#ccc';
                    
                    // Update the knob position
                    const knob = slider.querySelector('div');
                    if (knob) {
                        knob.style.left = state ? '18px' : '2px';
                    }
                }
            }
            
            break;
        }
    }
}

// Start the action sequence
function startActionSequence() {
    // Only start if not already running
    if (!actionSequenceRunning) {
        // Reset flags and stop any existing animations
        actionSequenceRunning = true;
        if (pigMixer) {
            pigMixer.stopAllAction();
        }
        
        // Play the kick animation (same as pressing "2")
        if (pigMixer && pigAnimations && pig) {
            // Use animation index 1 (the same as pressing "2")
            const kickAnimIndex = 1;
            
            // Find the hip bone to track position
            let hipBone;
            pig.traverse(node => {
                if (node.isBone && node.name === "mixamorigHips") {
                    hipBone = node;
                }
            });
            
            // Play the kick animation and store the action
            pigKickAction = pigMixer.clipAction(pigAnimations[4]);
            
            // Set the animation to play once
            pigKickAction.setLoop(THREE.LoopOnce);
            pigKickAction.clampWhenFinished = false;
            pigKickAction.reset();
            pigKickAction.play();
            
            // Remove any existing finished event listeners
            pigMixer.removeEventListener('finished');
            
            // Add event listener for animation sequencing
            pigMixer.addEventListener('finished', function(e) {
                if (e.action === pigKickAction && hipBone) {
                    // Check if this is the second animation
                    if (pigKickAction._clip === pigAnimations[0]) {
                        // If it's the second animation, hold the last frame
                        pigKickAction.enabled = true;
                        pigKickAction.paused = true;
                        pigKickAction.time = pigKickAction._clip.duration;
                        return;
                    }
                    
                    // Get ending position
                    const worldPos = new THREE.Vector3();
                    hipBone.getWorldPosition(worldPos);
                    
                    // Update pig position to match end of animation
                    pig.position.x = worldPos.x;
                    pig.position.y = 0; // Keep on ground
                    pig.position.z = worldPos.z;
                    
                    // Create a new kick action for the second animation
                    const nextKickAction = pigMixer.clipAction(pigAnimations[0]);
                    nextKickAction.reset();
                    nextKickAction.setLoop(THREE.LoopOnce);
                    nextKickAction.clampWhenFinished = true;

                    // Set starting frame (time in seconds)
                    const fps = 30;  // assuming 30 fps animation
                    const startFrame = 5;
                    nextKickAction.time = startFrame / fps;
                    
                    // Hold the last frame of the first animation
                    pigKickAction.paused = true;
                    pigKickAction.time = pigKickAction._clip.duration - 10; // Set to last frame
                    
                    // Delay the second animation by 600ms
                    setTimeout(() => {
                        // Resume the first animation before crossfade
                        // pigKickAction.paused = false;
                        // Crossfade between animations
                        pigKickAction.crossFadeTo(nextKickAction, 0.15, false);
                         nextKickAction.play();
                    }, 0);
                    
                    // Update reference to current action
                    pigKickAction = nextKickAction;
                    
                    // Update the active animation text
                    updateActiveAnimationText(pigAnimations[0].name);
                    
                    console.log(`Crossfading to next kick animation from position:`, worldPos);
                }
            });
            
            console.log(`Pig kick animation started: ${pigAnimations[kickAnimIndex].name}`);
        }
        
        // Wait a short time before kicking the ball
        setTimeout(() => {
            if (ball && ball.visible && !ballAnimating) {
                kickBall();
                
                // When the ball is kicked, also have the duck do the goal_save animation
                if (duckMixer && duckAnimations) {
                    // Find the goal_save animation
                    let saveAnimIndex = -1;
                    
                    // Search for an animation with "goal_save" or "save" in the name
                    for (let i = 0; i < duckAnimations.length; i++) {
                        const animName = duckAnimations[i].name.toLowerCase();
                        if (animName.includes('goal_save') || animName.includes('save')) {
                            saveAnimIndex = i;
                            break;
                        }
                    }
                    
                    // If no specific save animation found, try index 3 as a fallback
                    if (saveAnimIndex === -1) {
                        saveAnimIndex = 3;
                        console.warn("No 'goal_save' animation found. Using animation index 3 as fallback.");
                    }
                    
                    // Stop any current animations
                    duckMixer.stopAllAction();
                    
                    // Play the save animation and store the action
                    duckReactAction = duckMixer.clipAction(duckAnimations[saveAnimIndex]);
                    
                    // Set the animation to play once and hold the last frame
                    duckReactAction.setLoop(THREE.LoopOnce);
                    duckReactAction.clampWhenFinished = true;
                    
                    // Start the animation
                    duckReactAction.reset();
                    duckReactAction.play();
                    
                    // Add event listener for when save animation finishes
                    duckMixer.addEventListener('finished', function(e) {
                        if (e.action === duckReactAction) {
                            // Check if this is the second animation
                            if (duckReactAction._clip === duckAnimations[4]) {
                                // If it's the second animation, hold the last frame
                                duckReactAction.enabled = true;
                                duckReactAction.paused = true;
                                duckReactAction.time = duckReactAction._clip.duration;
                                return;
                            }
                            
                            // Create a simple fade effect
                            let opacity = 1.0;
                            const fadeOutDuration = 100; // ms
                            const fadeInDuration = 100; // ms
                            const startTime = Date.now();
                            
                            // Find all materials on the duck
                            const materials = [];
                            duck.traverse(node => {
                                if (node.isMesh && node.material) {
                                    if (Array.isArray(node.material)) {
                                        node.material.forEach(mat => {
                                            if (!materials.includes(mat)) {
                                                materials.push(mat);
                                                // Enable transparency
                                                mat.transparent = true;
                                            }
                                        });
                                    } else {
                                        if (!materials.includes(node.material)) {
                                            materials.push(node.material);
                                            // Enable transparency
                                            node.material.transparent = true;
                                        }
                                    }
                                }
                            });
                            
                            // Store original opacity values
                            const originalOpacity = materials.map(mat => mat.opacity);
                            
                            // Fade out function
                            function fadeOut() {
                                const elapsed = Date.now() - startTime;
                                opacity = Math.max(0, 1 - (elapsed / fadeOutDuration));
                                
                                // Apply opacity to all materials
                                materials.forEach(mat => {
                                    mat.opacity = opacity;
                                });
                                
                                if (opacity > 0) {
                                    requestAnimationFrame(fadeOut);
                                } else {
                                    // Duck is now invisible, set up the next animation
                                    setupNextAnimation();
                                }
                            }
                            
                            // Start fade out
                            fadeOut();
                            
                            // Set up the next animation
                            function setupNextAnimation() {
                                // Find the hip bone to track position
                                let hipBone;
                                duck.traverse(node => {
                                    if (node.isBone && node.name === "mixamorigHips") {
                                        hipBone = node;
                                    }
                                });
                                
                                // Get ending position
                                const worldPos = new THREE.Vector3();
                                hipBone.getWorldPosition(worldPos);
                                
                                // Update duck position to match end of animation
                                duck.position.x = worldPos.x;
                                duck.position.y = 0; // Keep on ground
                                duck.position.z = worldPos.z;
                                
                                // Store the current position
                                const currentPos = duck.position.clone();
                                
                                // Create the flip animation
                                duckMixer.stopAllAction();
                                const flipAction = duckMixer.clipAction(duckAnimations[4]);
                                flipAction.reset();
                                flipAction.setLoop(THREE.LoopOnce);
                                flipAction.clampWhenFinished = true;
                                
                                // Play the animation for a tiny amount to see where it positions the model
                                flipAction.play();
                                duckMixer.update(0.001);
                                
                                // Calculate the offset between where we want to be and where the animation puts us
                                const newPos = duck.position.clone();
                                const offset = new THREE.Vector3().subVectors(currentPos, newPos);
                                
                                // Apply the offset to keep the duck in the same place
                                duck.position.add(offset);
                                
                                // Reset and replay the animation from the adjusted position
                                flipAction.reset();
                                
                                // Start the fade in
                                const fadeInStartTime = Date.now();
                                
                                // Fade in function
                                function fadeIn() {
                                    const elapsed = Date.now() - fadeInStartTime;
                                    opacity = Math.min(1, elapsed / fadeInDuration);
                                    
                                    // Apply opacity to all materials
                                    materials.forEach((mat, i) => {
                                        mat.opacity = opacity * originalOpacity[i];
                                    });
                                    
                                    if (opacity < 1) {
                                        requestAnimationFrame(fadeIn);
                                    } else {
                                        // Restore original transparency settings
                                        materials.forEach((mat, i) => {
                                            mat.opacity = originalOpacity[i];
                                            mat.transparent = originalOpacity[i] < 1;
                                        });
                                    }
                                }
                                
                                // Start fade in and play animation
                                fadeIn();
                                flipAction.play();
                                
                                // Update reference to current action
                                duckReactAction = flipAction;
                                
                                // Update the animation name display
                                updateActiveDuckAnimationText(duckAnimations[4].name);
                                
                                // Add event listener for when flip animation finishes
                                duckMixer.addEventListener('finished', function(e) {
                                    if (e.action === flipAction) {
                                        // Store the current position
                                        const currentPos = duck.position.clone();
                                        
                                        // Create the dance animation
                                        const danceAction = duckMixer.clipAction(duckAnimations[0]);
                                        danceAction.reset();
                                        danceAction.setLoop(THREE.LoopRepeat); // Let it loop
                                        
                                        // Play the animation for a tiny amount to see where it positions the model
                                        danceAction.play();
                                        duckMixer.update(0.001);
                                        danceAction.stop();
                                        
                                        // Calculate the offset between where we want to be and where the animation puts us
                                        const newPos = duck.position.clone();
                                        const offset = new THREE.Vector3().subVectors(currentPos, newPos);
                                        
                                        // Apply the offset to keep the duck in the same place
                                        duck.position.add(offset);
                                        
                                        // Reset the dance animation
                                        danceAction.reset();
                                        
                                        // Set up a smooth crossfade from flip to dance
                                        // Keep the flip action enabled but paused at the last frame
                                        flipAction.enabled = true;
                                        flipAction.paused = true;
                                        flipAction.time = flipAction._clip.duration;
                                        
                                        // Start the dance with a crossfade
                                        const crossfadeDuration = 0.5; // Half a second crossfade
                                        flipAction.crossFadeTo(danceAction, crossfadeDuration, true);
                                        danceAction.play();
                                        
                                        // Update reference to current action
                                        duckReactAction = danceAction;
                                        
                                        // Update the animation name display
                                        updateActiveDuckAnimationText(duckAnimations[0].name);
                                        
                                        console.log(`Duck dance animation started with smooth crossfade: ${duckAnimations[0].name}`);
                                    }
                                });
                                
                                // Show the goodbye button when the dance animation starts
                                createGoodbyeButton();
                            }
                        }
                    });
                    
                    console.log(`Duck goal_save animation started: ${duckAnimations[saveAnimIndex].name} (index ${saveAnimIndex})`);
                }
            }
        }, 800); // 800ms delay
        
        console.log("Action sequence started");
        
        // Log available animations to help identify the correct indices
        if (duckAnimations) {
            console.log("Available duck animations:");
            duckAnimations.forEach((anim, index) => {
                console.log(`${index}: ${anim.name}`);
            });
        }
    }
}

// Reset the scene to initial state
function resetScene() {
    // Stop any running sequence
    actionSequenceRunning = false;
    
    // Reset ball position and rotation
    if (ball) {
        ball.position.copy(ballStartPosition);
        ball.rotation.set(0, 0, 0);
    }
    
    // Reset pig position and animation
    if (pig) {
        pig.position.copy(pigPosition); // Reset to default position
    }
    
    // Reset duck position and animation
    if (duck) {
        duck.position.copy(duckPosition); // Reset to default position
        duck.rotation.y = Math.PI; // Reset rotation (180 degrees)
    }
    
    // Reset animations
    if (pigMixer) {
        pigMixer.stopAllAction();
        
        // Find and play the "stand" animation
        if (pigAnimations && pigAnimations.length > 0) {
            let standAnimIndex = 0;
            
            for (let i = 0; i < pigAnimations.length; i++) {
                const animName = pigAnimations[i].name.toLowerCase();
                if (animName.includes('stand') || animName.includes('idle')) {
                    standAnimIndex = i;
                    break;
                }
            }
            
            const action = pigMixer.clipAction(pigAnimations[standAnimIndex]);
            action.reset();
            action.play();
            
            updateActiveAnimationText(pigAnimations[standAnimIndex].name);
        }
    }
    
    if (duckMixer) {
        duckMixer.stopAllAction();
        
        // Find and play the "stand" animation
        if (duckAnimations && duckAnimations.length > 0) {
            let standAnimIndex = 0;
            
            for (let i = 0; i < duckAnimations.length; i++) {
                const animName = duckAnimations[i].name.toLowerCase();
                if (animName.includes('stand') || animName.includes('idle')) {
                    standAnimIndex = i;
                    break;
                }
            }
            
            const action = duckMixer.clipAction(duckAnimations[standAnimIndex]);
            action.reset();
            action.play();
            
            updateActiveDuckAnimationText(duckAnimations[standAnimIndex].name);
        }
    }
    
    // Reset flags
    ballAnimating = false;
    ballAnimationCompleted = false;
    pigAnimationStarted = false;
    duckReactionStarted = false;
    
    // Reset camera position
    resetCameraPosition();
    
    // Make welcome button visible again if it was hidden
    scene.children.forEach(child => {
        if (child.name === 'welcomeButton') {
            child.visible = true;
            
            // Reset opacity if it was faded
            if (child.material) {
                child.material.opacity = 1;
            }
        }
        
        // Remove goodbye button
        if (child.name === 'goodbyeButton') {
            scene.remove(child);
        }
    });
    
    console.log("Scene fully reset to initial state");
}

// Kick the ball with a smooth, simple arc
function kickBall() {
    // Only start if not already animating
    if (!ballAnimating && ball) {
        // Reset ball position to start
        ball.position.copy(ballStartPosition);
        ball.rotation.set(0, 0, 0);
        
        // Start animation
        ballAnimating = true;
        ballAnimationStartTime = Date.now();
        ballAnimationCompleted = false;
        
        console.log("Ball kicked with smooth arc");
    }
}

// Create a stylized welcome button with dark gold color
function createWelcomeButton() {
    // Create a canvas for the button texture
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    
    // Clear the canvas completely first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Button background - rounded rectangle with dark gold gradient
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#6A1B9A');  // purple top
    gradient.addColorStop(1, '#38006B');  // purple bottom
    
    // Draw rounded rectangle for button with padding
    const cornerRadius = 60;
    const padding = 80;
    
    // Draw the button shape
    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(canvas.width - cornerRadius, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    context.lineTo(canvas.width, canvas.height - cornerRadius);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    context.lineTo(cornerRadius, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    context.lineTo(0, cornerRadius);
    context.quadraticCurveTo(0, 0, cornerRadius, 0);
    context.closePath();
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fill();
    
    // Add a subtle shadow for depth
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 10;
    
    // Reset shadow for text
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 5;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Add main text - using consistent font size of 90px
    context.fillStyle = 'white';
    context.font = 'bold 90px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw the main text
    context.fillText('Welcome!', canvas.width/2, canvas.height/2 - 80);
    
    // Add instruction text - using consistent font size of 60px
    context.font = 'bold 60px Arial, sans-serif';
    // Change text to indicate click/tap instead of key press
    const actionText = isMobileDevice() ? '(Tap to start)' : '(Click to start)';
    context.fillText(actionText, canvas.width/2, canvas.height/2 + 80);
    
    // Create a texture from the canvas
    const buttonTexture = new THREE.CanvasTexture(canvas);
    
    // Create a material with the button texture
    const buttonMaterial = new THREE.MeshBasicMaterial({
        map: buttonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create a plane for the button
    const buttonGeometry = new THREE.PlaneGeometry(5, 2.5);
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    
    // Position the button in front of the camera
    button.position.set(0, 2, 0);
    button.name = 'welcomeButton';
    
    // Make sure it faces the camera initially
    button.lookAt(camera.position);
    
    // Add a slight floating animation
    button.userData = {
        startY: 2,
        amplitude: 0.1,
        speed: 0.001,
        startTime: Date.now(),
        isButton: true,
        onClick: startActionSequence
    };
    
    // Add to scene
    scene.add(button);
    
    // Add a pulsing effect to make it more noticeable
    addButtonPulseEffect(button);
    
    console.log("Welcome button created with dark gold color");
}

// Make sure this function exists and works for both buttons
function addButtonPulseEffect(button) {
    // Create a timeline for pulsing effect
    const timeline = {
        time: 0,
        duration: 2000, // 2 seconds per pulse
        startScale: 1.0,
        endScale: 1.1,
        pulsing: true
    };
    
    // Add the timeline to the button's userData
    button.userData.timeline = timeline;
    
    // Create an update function for the pulse effect
    const updatePulse = (deltaTime) => {
        if (!button.userData.timeline.pulsing) return;
        
        // Update time
        button.userData.timeline.time += deltaTime * 1000;
        if (button.userData.timeline.time > button.userData.timeline.duration) {
            button.userData.timeline.time = 0;
        }
        
        // Calculate scale based on time
        const progress = button.userData.timeline.time / button.userData.timeline.duration;
        const scale = button.userData.timeline.startScale + 
                     (button.userData.timeline.endScale - button.userData.timeline.startScale) * 
                     (Math.sin(progress * Math.PI * 2) * 0.5 + 0.5);
        
        // Apply scale
        button.scale.set(scale, scale, scale);
    };
    
    // Add the update function to the button
    button.userData.updatePulse = updatePulse;
}

// Reset camera to default position
function resetCameraPosition() {
    // Create a smooth transition
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = Date.now();
    const duration = 1000; // 1 second transition
    
    function updateCameraPosition() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easeInOutCubic for smooth transition
        const easeProgress = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Interpolate position
        camera.position.lerpVectors(
            startPosition, 
            defaultCameraPosition,
            easeProgress
        );
        
        // Interpolate target
        controls.target.lerpVectors(
            startTarget,
            defaultCameraTarget,
            easeProgress
        );
        
        // Update controls
        controls.update();
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(updateCameraPosition);
        } else {
            console.log("Camera reset to default position");
        }
    }
    
    // Start the transition
    updateCameraPosition();
}

// Create a stylized goodbye button with red color
function createGoodbyeButton() {
    // Create a canvas for the button texture
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    
    // Clear the canvas completely first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Button background - rounded rectangle with red gradient
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FF3333');  // Bright red top
    gradient.addColorStop(1, '#990000');  // Darker red bottom
    
    // Draw rounded rectangle for button with padding
    const cornerRadius = 60;
    const padding = 80;
    
    // Draw the button shape
    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(canvas.width - cornerRadius, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    context.lineTo(canvas.width, canvas.height - cornerRadius);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    context.lineTo(cornerRadius, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    context.lineTo(0, cornerRadius);
    context.quadraticCurveTo(0, 0, cornerRadius, 0);
    context.closePath();
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fill();
    
    // Add a subtle shadow for depth
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 10;
    
    // Reset shadow for text
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 5;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Add main text - using consistent font size of 90px
    context.fillStyle = 'white';
    context.font = 'bold 90px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw the main text
    context.fillText('Pig Loses!', canvas.width/2, canvas.height/2 - 80);
    
    // Add instruction text - using consistent font size of 60px
    context.font = 'bold 60px Arial, sans-serif';
    // Change text to indicate click/tap instead of key press
    const actionText = isMobileDevice() ? '(Tap to reset)' : '(Click to reset)';
    context.fillText(actionText, canvas.width/2, canvas.height/2 + 80);
    
    // Create a texture from the canvas
    const buttonTexture = new THREE.CanvasTexture(canvas);
    
    // Create a material with the button texture
    const buttonMaterial = new THREE.MeshBasicMaterial({
        map: buttonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create a plane for the button - make it slightly larger for easier clicking
    const buttonGeometry = new THREE.PlaneGeometry(5.5, 3); // Increased size
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    
    // Position the button in front of the camera and slightly lower
    button.position.set(0, 1.8, 0); // Lowered position
    button.name = 'goodbyeButton';
    
    // Make sure it faces the camera initially
    button.lookAt(camera.position);
    
    // Add a slight floating animation
    button.userData = {
        startY: 1.8, // Match the new position
        amplitude: 0.1,
        speed: 0.001,
        startTime: Date.now(),
        isButton: true,
        onClick: function() {
            // Add fade out animation before resetting
            const fadeOutDuration = 1000; // 1 second
            const startTime = Date.now();
            
            function fadeOut() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeOutDuration, 1);
                
                if (button.material) {
                    button.material.opacity = 1 - progress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    // Once fully faded out, reset the scene
                    resetScene();
                }
            }
            
            fadeOut();
        }
    };
    
    // Add to scene
    scene.add(button);
    
    // Add a pulsing effect to make it more noticeable
    addButtonPulseEffect(button);
    
    console.log("Goodbye button created with red color and improved click detection");
}

// Add this function to your code
function updateButtons(deltaTime) {
    scene.children.forEach(child => {
        if (child.name === 'welcomeButton' || child.name === 'goodbyeButton') {
            // Make button always face the camera
            child.lookAt(camera.position);
            
            // Apply floating animation
            if (child.userData && child.userData.startY !== undefined) {
                const time = Date.now() * child.userData.speed;
                child.position.y = child.userData.startY + Math.sin(time) * child.userData.amplitude;
            }
        }
    });
}

// Helper function to detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Add this function to handle click/tap events
function handleClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections with buttons - use a larger threshold for better detection
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Check for button clicks
    let buttonClicked = false;
    
    for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        
        // Check if the object is a button or has a parent that is a button
        let targetObject = object;
        
        // Look for button in the object or its ancestors
        while (targetObject) {
            if (targetObject.userData && targetObject.userData.isButton && targetObject.userData.onClick) {
                buttonClicked = true;
                
                // Add a visual feedback for the click
                const originalScale = targetObject.scale.x;
                
                // Quick scale down and up animation
                const scaleDown = () => {
                    targetObject.scale.set(originalScale * 0.9, originalScale * 0.9, 1);
                    
                    // If it's the welcome button, fade it out
                    if (targetObject.name === 'welcomeButton') {
                        // Fade out animation
                        const fadeOutDuration = 1000; // 1 second
                        const startTime = Date.now();
                        
                        function fadeOut() {
                            const elapsed = Date.now() - startTime;
                            const progress = Math.min(elapsed / fadeOutDuration, 1);
                            
                            if (targetObject.material) {
                                targetObject.material.opacity = 1 - progress;
                            }
                            
                            if (progress < 1) {
                                requestAnimationFrame(fadeOut);
                            } else {
                                targetObject.visible = false;
                            }
                        }
                        
                        fadeOut();
                    }
                    
                    setTimeout(() => {
                        targetObject.scale.set(originalScale, originalScale, 1);
                        
                        // Call the button's click handler after the visual feedback
                        targetObject.userData.onClick();
                    }, 100);
                };
                
                scaleDown();
                break;
            }
            
            // Move up to parent
            targetObject = targetObject.parent;
        }
        
        if (buttonClicked) break;
    }
    
    // Debug click detection
    if (!buttonClicked) {
        console.log("Click detected but no button found at coordinates:", mouse.x, mouse.y);
    }
}
