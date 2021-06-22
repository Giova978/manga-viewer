<template>
    <reload-prompt />
    <input type="text" v-model="chapterIndex" />
    <input type="file" accept=".zip" @change="decompress" />
    <select name="chapter" id="chapter" v-model="chapterIndex">
        <option v-for="(chapter, index) in chapters" :value="index" :key="index">{{ chapter }}</option>
    </select>
    <div class="imgs">
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
        />
    </div>
</template>

<script lang="ts">
import ReloadPrompt from "./components/ReloadPrompt.vue";
import { getLocalStorage, saveLocalStorage } from "./useLocalStorage";

import { Entry, BlobWriter } from "@zip.js/zip.js";
import { computed, defineComponent, ref, watch, watchEffect } from "vue";
import { decompressAndSort } from "./useDecompress";

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
        const fileName = ref("");
        const loadedCheckpoint = ref(false);

        const createUrl = async (entry: Entry) => {
            return URL.createObjectURL(await entry.getData!(new BlobWriter()));
        };

        const decompress = async (event: any) => {
            const file = event.target.files[0];
            if (!file) return;

            const chapters = await decompressAndSort(file);
            if (!chapters) return;

            fileName.value = file.name;
            manga.value = chapters;

            imgs.value = (await getImgs(chapterIndex.value))!;
        };

        const getImgs = (index: number) => {
            if (!manga.value?.length) return;

            const arr = manga.value[index][1].map((entry: Entry) => createUrl(entry).catch());

            return Promise.all(arr);
        };

        const scrollDown = (event: any) => {
            window.scrollTo({
                left: 0,
                top: window.innerHeight + window.pageYOffset - 400,
                behavior: "smooth",
            });
        };

        const chapters = computed(() => manga.value.map(([title]) => title));

        watch(chapterIndex, async (newVal, oldVal) => {
            saveLocalStorage(fileName.value, newVal.toString());
            saveLocalStorage(fileName.value + "Img", "0");
            imgs.value = (await getImgs(newVal))!;
        });

        watch(fileName, () => {
            chapterIndex.value = 0;
            loadedCheckpoint.value = false;
        });

        const observer = new IntersectionObserver(
            (entries, observer) => {
                if (!loadedCheckpoint.value) return;
                saveLocalStorage(
                    fileName.value + "Img",
                    entries[0].target.attributes.getNamedItem("data-index")!.value,
                );
            },
            { threshold: [0.3] },
        );

        watchEffect(
            () => {
                if (imgsRefs.value.length <= 0) return;
                imgsRefs.value.map((el) => observer.observe(el));

                if (!loadedCheckpoint.value) {
                    const lastChapter = getLocalStorage(fileName.value);
                    const lastImg = getLocalStorage(fileName.value + "Img");

                    if (lastChapter && parseInt(lastChapter) !== chapterIndex.value) {
                        chapterIndex.value = parseInt(lastChapter);
                    }

                    if (!lastImg) loadedCheckpoint.value = true;

                    const timeout = setTimeout(() => {
                        window.scrollTo(0, imgsRefs.value[parseInt(lastImg!)].offsetTop);
                        loadedCheckpoint.value = true;
                        clearTimeout(timeout);
                    }, 50);
                }
            },
            {
                flush: "post",
            },
        );

        return {
            manga,
            chapterIndex,
            imgs,
            imgsRefs,
            chapters,
            loadedCheckpoint,

            fileName,

            decompress,
            createUrl,
            scrollDown,
        };
    },
});
</script>

<style lang="scss">
body {
    margin: 0;
    padding: 0;
    box-sizing: content-box;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}

select {
    max-width: 100%;
}

.imgs {
    max-width: 100vw;

    img {
        max-width: 100%;
    }
}
</style>
