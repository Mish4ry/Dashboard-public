let ytPlayer = null;
let loadTimeout = null;
let currentVideoId = "";

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

document.addEventListener("DOMContentLoaded", () => {
  const clockEl = document.querySelector(".clock");
  if (clockEl) {
    function updateClock() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    setInterval(updateClock, 1000);
    updateClock();
  }

  for (let i = 1; i <= 4; i++) {
    const titleEl = document.getElementById(`cat-title-${i}`);
    if (titleEl) {
      const savedTitle = localStorage.getItem(`cat-title-${i}`);
      if (savedTitle) {
        titleEl.textContent = savedTitle;
      }
      titleEl.addEventListener("blur", () => {
        localStorage.setItem(`cat-title-${i}`, titleEl.textContent);
      });
    }
  }

  loadLinks();

  let timeLeft = 25 * 60;
  let timerId = null;
  const display = document.getElementById("timer-display");
  const startBtn = document.getElementById("start-btn");
  const resetBtn = document.getElementById("reset-btn");

  function updateDisplay() {
    if (!display) return;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    document.title = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} - Dashboard`;
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (timerId) return;
      timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
          clearInterval(timerId);
          timerId = null;
          timeLeft = 25 * 60;
          updateDisplay();
          if (Notification.permission === "granted") {
            new Notification("Pomodoro terminé !", {
              body: "C'est l'heure de la pause.",
            });
          }
        }
      }, 1000);

      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearInterval(timerId);
      timerId = null;
      timeLeft = 25 * 60;
      updateDisplay();
      document.title = "Dashboard";
    });
  }

  const focusBtn = document.getElementById("focus-btn");
  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      document.body.classList.toggle("focus-active");
      focusBtn.textContent = document.body.classList.contains("focus-active")
        ? "Exit Focus"
        : "Focus Mode";
    });
  }

  const bgInput = document.getElementById("bg-upload");
  if (bgInput) {
    bgInput.addEventListener("change", function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.body.style.backgroundImage = `url('${e.target.result}')`;
          localStorage.setItem("user-bg", e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const removeBgBtn = document.getElementById("remove-bg-btn");
  if (removeBgBtn) {
    removeBgBtn.addEventListener("click", () => {
      document.body.style.backgroundImage = "none";
      localStorage.removeItem("user-bg");
    });
  }

  const savedBg = localStorage.getItem("user-bg");
  if (savedBg) {
    document.body.style.backgroundImage = `url('${savedBg}')`;
  }

  const musicToggleBtn = document.getElementById("music-toggle-btn");
  const closeMusicBtn = document.getElementById("close-music-btn");
  const loadMediaBtn = document.getElementById("load-media");

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", () => openMusicPanel());
  }
  if (closeMusicBtn) {
    closeMusicBtn.addEventListener("click", () => closeMusicPanel());
  }

  const savedPlaylist = localStorage.getItem("user-saved-playlist");
  if (savedPlaylist) {
    document.getElementById("input-area").style.display = "none";
    document.getElementById("controls-area").style.display = "flex";
    loadEmbed(savedPlaylist);
  }

  if (loadMediaBtn) {
    loadMediaBtn.addEventListener("click", () => {
      const link = document.getElementById("media-link").value.trim();
      if (!link) return;

      localStorage.setItem("user-saved-playlist", link);

      document.getElementById("input-area").style.display = "none";
      document.getElementById("controls-area").style.display = "flex";

      loadEmbed(link);
      openMusicPanel();

      loadTimeout = setTimeout(() => {
        const iframe = document.querySelector(
          "#embed-box iframe, #yt-player-placeholder",
        );
        if (!iframe) {
          openPanel(
            "Erreur de lecture",
            "Le lecteur n'a pas répondu. Vérifie le lien ou ta connexion.",
          );
        }
      }, 5000);
    });
  }

  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchEngine = document.getElementById("search-engine");

  if (searchEngine && searchForm) {
    const savedEngine = localStorage.getItem("preferred-engine");
    if (savedEngine) {
      searchEngine.value = savedEngine;
    }

    searchEngine.addEventListener("change", () => {
      localStorage.setItem("preferred-engine", searchEngine.value);
    });

    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        const engineUrl = searchEngine.value;
        window.open(engineUrl + encodeURIComponent(query), "_blank");
        searchInput.value = "";
      }
    });
  }
});

function loadLinks() {
  for (let i = 1; i <= 4; i++) {
    const linksList = document.getElementById(`links-${i}`);
    if (!linksList) continue;

    const savedLinks = JSON.parse(localStorage.getItem(`cat-links-${i}`)) || [];
    linksList.innerHTML = "";

    savedLinks.forEach((link, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "link-item";

      const a = document.createElement("a");
      a.href = link.url;
      a.textContent = link.name;
      a.target = "_blank";

      const delBtn = document.createElement("span");
      delBtn.textContent = "✕";
      delBtn.className = "delete-link";
      delBtn.onclick = () => deleteLink(i, index);

      wrapper.appendChild(a);
      wrapper.appendChild(delBtn);
      linksList.appendChild(wrapper);
    });
  }
}

function addLink(catId) {
  const name = prompt("Nom du lien :");
  if (!name) return;

  let url = prompt("URL (ex: github.com) :");
  if (!url) return;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const savedLinks =
    JSON.parse(localStorage.getItem(`cat-links-${catId}`)) || [];
  savedLinks.push({ name, url });
  localStorage.setItem(`cat-links-${catId}`, JSON.stringify(savedLinks));

  loadLinks();
}

function deleteLink(catId, index) {
  const savedLinks =
    JSON.parse(localStorage.getItem(`cat-links-${catId}`)) || [];
  savedLinks.splice(index, 1);
  localStorage.setItem(`cat-links-${catId}`, JSON.stringify(savedLinks));
  loadLinks();
}

function loadEmbed(link) {
  const embedBox = document.getElementById("embed-box");
  const coverImg = document.getElementById("album-cover");
  if (!embedBox) return;

  embedBox.style.display = "block";
  embedBox.innerHTML = '<div id="yt-player-placeholder"></div>';

  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    let videoId = "";
    let playlistId = "";

    if (link.includes("list=")) {
      playlistId = link.split("list=")[1].split("&")[0];
    }
    if (link.includes("v=")) {
      videoId = link.split("v=")[1].split("&")[0];
    } else if (link.includes("youtu.be/")) {
      videoId = link.split("youtu.be/")[1].split("?")[0];
    }

    if (videoId) {
      currentVideoId = videoId;
      updateAlbumCover(videoId);
    }

    let playerConfig = {
      height: "1",
      width: "1",
      playerVars: {
        controls: 0,
        disablekb: 1,
        autoplay: 0,
        enablejsapi: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerLoaded,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    };

    if (playlistId) {
      playerConfig.playerVars.listType = "playlist";
      playerConfig.playerVars.list = playlistId;
    } else if (videoId) {
      playerConfig.videoId = videoId;
    }

    if (window.YT && window.YT.Player) {
      ytPlayer = new YT.Player("yt-player-placeholder", playerConfig);
    } else {
      window.onYouTubeIframeAPIReady = () => {
        ytPlayer = new YT.Player("yt-player-placeholder", playerConfig);
      };
    }
  } else if (link.includes("spotify.com")) {
    ytPlayer = null;
    if (coverImg) {
      coverImg.src =
        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80";
    }
    const spotifyUrl = link
      .replace("/track/", "/embed/track/")
      .replace("/playlist/", "/embed/playlist/");
    embedBox.innerHTML = `<iframe src="${spotifyUrl}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    onPlayerLoaded();
  }
}

function updateAlbumCover(videoId) {
  const coverImg = document.getElementById("album-cover");
  if (!coverImg || !videoId) return;

  const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  coverImg.src = hqUrl;
}

function onPlayerLoaded(event) {
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
}

function onPlayerStateChange(event) {
  const btn = document.getElementById("play-pause-btn");
  if (btn) {
    if (event.data === YT.PlayerState.PLAYING) {
      btn.textContent = "⏸";
    } else if (
      event.data === YT.PlayerState.PAUSED ||
      event.data === YT.PlayerState.ENDED
    ) {
      btn.textContent = "▶";
    }
  }

  if (
    event.data === YT.PlayerState.PLAYING ||
    event.data === YT.PlayerState.BUFFERING
  ) {
    setTimeout(() => {
      if (ytPlayer && typeof ytPlayer.getVideoData === "function") {
        const videoData = ytPlayer.getVideoData();
        if (
          videoData &&
          videoData.video_id &&
          videoData.video_id !== currentVideoId
        ) {
          currentVideoId = videoData.video_id;
          updateAlbumCover(currentVideoId);
        }
      }
    }, 150);
  }
}

function onPlayerError(event) {
  if (ytPlayer && typeof ytPlayer.nextVideo === "function") {
    ytPlayer.nextVideo();
  }
}

function togglePlay() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;

  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
}

function prev() {
  if (!ytPlayer) return;
  if (typeof ytPlayer.previousVideo === "function" && ytPlayer.getPlaylist()) {
    ytPlayer.previousVideo();
  } else if (typeof ytPlayer.seekTo === "function") {
    ytPlayer.seekTo(ytPlayer.getCurrentTime() - 10, true);
  }
}

function next() {
  if (!ytPlayer) return;
  if (typeof ytPlayer.nextVideo === "function" && ytPlayer.getPlaylist()) {
    ytPlayer.nextVideo();
  } else if (typeof ytPlayer.seekTo === "function") {
    ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10, true);
  }
}

function resetPlayer() {
  localStorage.removeItem("user-saved-playlist");
  document.getElementById("input-area").style.display = "flex";
  document.getElementById("controls-area").style.display = "none";
  const embedBox = document.getElementById("embed-box");
  if (embedBox) {
    embedBox.innerHTML = "";
    embedBox.style.display = "none";
  }
  if (ytPlayer) {
    ytPlayer.destroy();
    ytPlayer = null;
  }
}

function openMusicPanel() {
  const panel =
    document.getElementById("music-panel") ||
    document.getElementById("side-panel");
  if (panel) panel.classList.add("open");
}

function closeMusicPanel() {
  const panel =
    document.getElementById("music-panel") ||
    document.getElementById("side-panel");
  if (panel) panel.classList.remove("open");
}

function openPanel(title, text) {
  const titleEl = document.getElementById("side-panel-title");
  const textEl = document.getElementById("side-panel-text");
  const panel = document.getElementById("side-panel");

  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  if (panel) panel.classList.add("open");
}

function closePanel() {
  const panel = document.getElementById("side-panel");
  if (panel) panel.classList.remove("open");
}
