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
                    imgsRefs[index] = el;
                }
            "
            :data-index="index"
        />
    </div>
</template>

<script lang="ts">
import ReloadPrompt from "./components/ReloadPrompt.vue";

import { ZipReader, BlobReader, Entry, BlobWriter } from "@zip.js/zip.js";
import { computed, defineComponent, onBeforeUpdate, ref, watch } from "vue";

export default defineComponent({
    name: "App",
    components: {
        ReloadPrompt,
    },
    setup() {
        const manga = ref<[string, Entry[]][]>([]);
        const chapterIndex = ref(1);
        const imgs = ref<string[]>([]);
        const imgsRefs = ref<any[]>([]);
        const fileName = ref("");

        const createUrl = async (entry: Entry) => {
            return URL.createObjectURL(await entry.getData!(new BlobWriter()));
        };

        const decompress = async (event: any) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new ZipReader(new BlobReader(file));

            const entries = await reader.getEntries().catch(console.error);

            if (!entries) return;

            const chapters = Object.entries(
                entries.reduce((acc: { [key: string]: Entry[] }, el) => {
                    const chapter = el.filename.split("/")[2];

                    if (!acc[chapter]) acc[chapter] = [];

                    acc[chapter].push(el);

                    return acc;
                }, {}),
            );

            chapters
                .sort((a, b) => {
                    const aNumber = parseInt(a[0].match(/\d+/g)!.slice(0, 1).join("."));

                    const bNumber = parseInt(b[0].match(/\d+/g)!.slice(0, 1).join("."));

                    return aNumber - bNumber;
                })
                .map(([, entries]) => {
                    entries.sort((a, b) => {
                        const aNumber = parseInt(a.filename.split("/")[3].match(/\d+/g)![0]);
                        const bNumber = parseInt(b.filename.split("/")[3].match(/\d+/g)![0]);

                        return aNumber - bNumber;
                    });
                });

            manga.value = chapters;
            fileName.value = file.name;
            chapterIndex.value = 0;
        };

        const getImgs = (index: number) => {
            if (!manga.value?.length) return;

            const arr = manga.value[index]![1].map((entry: Entry) => createUrl(entry).catch());

            return Promise.all(arr);
        };

        const scrollDown = (event: any) => {
            window.scrollTo(0, window.innerHeight + window.pageYOffset - 400);
        };

        const chapters = computed(() => manga.value.map(([title]) => title));

        watch(chapterIndex, async (newVal, oldVal) => {
            imgs.value = (await getImgs(newVal))!;
        });

        onBeforeUpdate(() => {
            imgsRefs.value = [];
        });

        return {
            manga,
            chapterIndex,
            imgs,
            imgsRefs,
            chapters,

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

.imgs {
    max-width: 100vw;

    img {
        max-width: 100%;
    }
}
</style>
