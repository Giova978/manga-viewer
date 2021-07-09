<template>
    <reload-prompt />
    <div class="pages">
        <p>{{ parseInt(currentImg) + 1 }}/{{ imgs.length }}</p>
    </div>
    <div class="container">
        <header>
            <section class="inputs">
                <input type="file" accept=".zip" ref="fileRef" @change="decompress" />
                <select name="chapter" id="chapter" v-model="chapterIndex">
                    <option v-for="(chapter, index) in chapters" :value="index" :key="index">{{ chapter }}</option>
                </select>
            </section>

            <section class="controls">
                <button @click="previousChapter" :class="{ disabled: chapterIndex == 0 }">
                    <span class="fas fa-arrow-left"></span>
                </button>
                <button @click="nextChapter" :class="{ disabled: chapterIndex == manga.length }">
                    <span class="fas fa-arrow-right"></span>
                </button>
            </section>
        </header>

        <main>
            <img
                v-for="(blob, index) in imgs"
                :key="index"
                :src="blob"
                alt=""
                @click="scrollDown"
                :ref="
                    (el) => {
                        if (el) imgsRefs[index] = el;
                    }
                "
                :data-index="index"
                loading="lazy"
            />
        </main>
        <footer>
            <section class="controls">
                <button @click="previousChapter" :class="{ disabled: chapterIndex == 0 }">
                    <span class="fas fa-arrow-left"></span>
                </button>
                <button class="up" @click="scrollTop"><span class="fas fa-arrow-up"></span></button>
                <button @click="nextChapter" :class="{ disabled: chapterIndex == manga.length }">
                    <span class="fas fa-arrow-right"></span>
                </button>
            </section>
        </footer>
    </div>
</template>

<script lang="ts">
import ReloadPrompt from "./components/ReloadPrompt.vue";
import { getLocalStorage, saveLocalStorage } from "./useLocalStorage";

import { Entry } from "@zip.js/zip.js";
import { computed, defineComponent, onMounted, ref, watch, watchEffect } from "vue";
import { decompressAndSort, createUrl } from "./useDecompress";

export default defineComponent({
    name: "App",
    components: {
        ReloadPrompt,
    },
    setup() {
        const manga = ref<[string, Entry[]][]>([]);
        const chapterIndex = ref(0);
        const imgs = ref<string[]>([]);
        const imgsRefs = ref<any[]>([]);
        const fileRef = ref<any>();
        const fileName = ref("");
        const loadedCheckpoint = ref(false);
        const currentImg = ref("0");
        const scrollingUp = ref(false);
        let lastYOffset = 0;

        const decompress = async () => {
            const file = fileRef.value.files[0];
            if (!file) return;

            loadedCheckpoint.value = false;
            chapterIndex.value = parseInt(getLocalStorage(file.name) ?? "0");

            const chapters = await decompressAndSort(file);
            if (!chapters) return;

            fileName.value = file.name;
            manga.value = chapters;

            imgs.value = (await getImgs(chapterIndex.value))!;

            const lastImg = getLocalStorage(file.name + "Img") ?? "0";
            const timeout = setTimeout(() => {
                window.scrollTo({
                    left: 0,
                    top: imgsRefs.value[parseInt(lastImg!)].offsetTop,
                    behavior: "smooth",
                });

                currentImg.value = lastImg!;
                loadedCheckpoint.value = true;
                lastYOffset = window.pageYOffset || document.documentElement.scrollTop;
                clearTimeout(timeout);
            }, 50);
        };

        const getImgs = (index: number) => {
            if (manga.value.length <= 0) return;

            const arr = manga.value[index][1].map((entry: Entry) => createUrl(entry).catch());

            return Promise.all(arr);
        };

        const scrollDown = (event: any) => {
            window.scrollTo({
                left: 0,
                top: window.innerHeight + window.pageYOffset - window.innerHeight * 0.4,
                behavior: "smooth",
            });
        };

        const chapters = computed(() => manga.value.map(([title]) => title));

        watch(chapterIndex, async (newVal, oldVal) => {
            if (!loadedCheckpoint.value) return;
            saveLocalStorage(fileName.value, newVal.toString());
            saveLocalStorage(fileName.value + "Img", "0");
            imgs.value = (await getImgs(newVal))!;
        });

        const observer = new IntersectionObserver(
            (entries, observer) => {
                if (!loadedCheckpoint.value) return;
                currentImg.value = entries[0].target.attributes.getNamedItem("data-index")!.value;
                saveLocalStorage(
                    fileName.value + "Img",
                    entries[0].target.attributes.getNamedItem("data-index")!.value,
                );
            },
            { threshold: [0.4] },
        );

        watchEffect(
            () => {
                if (imgsRefs.value.length <= 0) return;
                imgsRefs.value.map((el) => observer.observe(el));
            },
            {
                flush: "post",
            },
        );

        const nextChapter = () => {
            if (chapterIndex.value + 1 >= manga.value.length) return;
            chapterIndex.value++;
        };

        const previousChapter = () => {
            if (chapterIndex.value - 1 < 0) return;
            chapterIndex.value--;
        };

        const scrollTop = () => {
            window.scrollTo({
                left: 0,
                top: 0,
                behavior: "smooth",
            });
        };

        const scroll = () => {
            const actualScroll = window.pageYOffset || document.documentElement.scrollTop;

            scrollingUp.value = actualScroll < lastYOffset;
            lastYOffset = actualScroll <= 0 ? 0 : actualScroll;
        };

        onMounted(() => {
            window.addEventListener("scroll", scroll, false);
        });

        return {
            manga,
            chapterIndex,
            imgs,
            imgsRefs,
            fileRef,
            chapters,
            loadedCheckpoint,
            currentImg,
            fileName,
            scrollingUp,

            decompress,
            createUrl,
            scrollDown,
            nextChapter,
            previousChapter,
            scrollTop,
        };
    },
});
</script>

<style lang="scss">
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}

.container {
    display: grid;
    justify-content: center;
}

main {
    display: grid;
    max-width: 1000px;

    img {
        border-top: 2px dotted #ccc;
        max-width: 100%;
        object-fit: contain;
    }
}

.controls {
    display: grid;
    grid-template-columns: 44px 1fr 44px;

    button {
        width: 44px;
        height: 44px;
        font-size: 30px;

        &:last-of-type {
            grid-column: 3;
        }
    }

    .disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    .up {
        justify-self: center;
    }
}

.pages {
    position: sticky;
    top: 0;
    left: 0;

    p {
        position: absolute;
        margin: 0;
        width: 60px;
        height: 30px;
        padding: 5px 5px 10px 5px;
        background: #d0d0d7;
        border: 2px solid #757579;
        border-width: 0px 2px 2px 0px;
        border-radius: 0px 0px 5px 0px;
    }
}

select {
    max-width: 100%;
    height: 44px;
}

header {
    .inputs {
        select {
            display: block;
            width: 100%;
            justify-self: center;
        }

        .decompress {
            height: 44px;
            width: 80px;
        }
    }
}

@media screen and (max-width: 500px) {
    .top {
        button {
            margin-right: 0;
        }
    }
}
</style>
