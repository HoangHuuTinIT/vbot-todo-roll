<template>
	<view class="side-pagination" @click.stop>
		<view class="page-size-trigger">
			<AppPicker :range="pageSizeOptionsStr" :value="pageSizeIndex" @change="onPageSizeChange">
				<view class="size-icon-box">
					<text class="size-number">{{ pageSize }}</text>
					<text class="size-label">/trang</text>
				</view>
			</AppPicker>
		</view>

		<view class="divider"></view>

		<scroll-view scroll-y class="pages-scroll" :scroll-into-view="'page-' + currentPage">
			<view class="pages-list">
				<view 
					v-for="p in totalPages" 
					:key="p" 
					:id="'page-' + p"
					class="page-dot" 
					:class="{ 'active': p === currentPage, 'loaded': p <= maxLoadedPage }"
					@click="onPageClick(p)"
				>
					<text class="dot-text">{{ p }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppPicker from '@/components/AppPicker.vue';

const props = defineProps<{
	total: number;
	pageSize: number;
	currentPage: number; // Trang hiện tại đang xem (tính toán theo vị trí cuộn)
	maxLoadedPage: number; // Trang lớn nhất đã tải dữ liệu về
	pageSizeOptions: number[];
}>();

const emit = defineEmits(['update:pageSize', 'jumpToPage']);

const totalPages = computed(() => {
	if (props.total === 0) return 1;
	return Math.ceil(props.total / props.pageSize);
});

const pageSizeOptionsStr = computed(() => props.pageSizeOptions.map(String));

const pageSizeIndex = computed(() => {
	return props.pageSizeOptions.indexOf(props.pageSize) > -1 
		? props.pageSizeOptions.indexOf(props.pageSize) 
		: 0;
});

const onPageSizeChange = (e: any) => {
	const idx = parseInt(e.detail.value);
	emit('update:pageSize', props.pageSizeOptions[idx]);
};

const onPageClick = (page: number) => {
	// Chỉ cho phép nhảy đến các trang đã load hoặc trang kế tiếp
	// Hoặc logic nhảy trang (sẽ reset list) tuỳ bạn chọn
	emit('jumpToPage', page);
};
</script>

<style lang="scss" scoped>
.side-pagination {
	position: fixed;
	right: 10px;
	top: 50%;
	transform: translateY(-50%);
	width: 44px;
	background-color: var(--bg-surface);
	border-radius: 22px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10px 0;
	z-index: 90;
	border: 1px solid var(--border-color);
	max-height: 70vh; /* Giới hạn chiều cao */
}

.page-size-trigger {
	margin-bottom: 5px;
}

.size-icon-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background-color: var(--bg-input);
}

.size-number {
	font-size: 14px;
	font-weight: bold;
	color: var(--text-primary);
	line-height: 1;
}

.size-label {
	font-size: 8px;
	color: var(--text-secondary);
}

.divider {
	width: 20px;
	height: 1px;
	background-color: var(--border-color);
	margin: 5px 0;
}

.pages-scroll {
	flex: 1; /* Tự co giãn trong max-height */
	height: 0; /* Quan trọng để scroll view hoạt động trong flex */
	width: 100%;
}

.pages-list {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 5px 0;
}

.page-dot {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
	background-color: transparent;
	border: 1px solid transparent;
}

.dot-text {
	font-size: 12px;
	color: var(--text-secondary);
}

.page-dot.loaded {
	/* Trang đã tải nhưng chưa focus */
	border-color: var(--border-color);
}

.page-dot.active {
	background-color: #007aff;
	transform: scale(1.1);
	box-shadow: 0 2px 5px rgba(0,122,255,0.3);
}

.page-dot.active .dot-text {
	color: #ffffff;
	font-weight: bold;
}
</style>