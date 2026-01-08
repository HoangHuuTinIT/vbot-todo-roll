<template>
	<view class="container" :class="{ 'theme-dark': isDark }">
		<view class="custom-header">
			<view @click="goBack" class="back-btn">
				<image src="/static/expand-arrow.png" class="back-icon" />
			</view>
			<text class="header-title">{{ $t('todo.create_page_title') }}</text>
			<view class="header-right"></view>
		</view>

		<view class="content-body">
			<view class="flat-item title-input-group">
				<view class="item-left">
					<image src="/static/edit-title-create-todo.png" class="item-icon"></image>
				</view>
				<textarea class="item-input title-textarea" v-model="form.name"
					:placeholder="$t('todo.enter_task_name')" maxlength="256" auto-height
					placeholder-class="input-placeholder" />
				<text class="char-count">
					{{ $t('todo.char_count', { current: form.name ? form.name.length : 0, max: 256 }) }}
				</text>
			</view>

			<TodoEditor v-model="form.desc" :placeholder="$t('editor.placeholder')" />

			<view class="flat-item customer-item" @click="openCustomerPopup">
			    <view class="item-left">
			        <image src="/static/price-tag-create-todo.png" class="item-icon"></image>
			    </view>
			    <view class="input-trigger" :class="{ 'placeholder': !form.customer }">
			        {{ form.customer || $t('todo.select_customer') }}
			    </view>
			    <text class="arrow-icon">›</text>
			</view>

			<CustomerModal :visible="showCustomerModal" :loading="loadingCustomer" :loadingMore="loadingMore"
				:customers="customerList" :managers="memberList" @close="showCustomerModal = false"
				@select="onCustomerSelect" @filter="onCustomerFilter" @loadMore="loadMoreCustomers" />

			<view class="flat-item">
				<view class="item-left">
					<image src="/static/internet.png" class="item-icon"></image>
				</view>

				<AppPicker :range="sourceOptions" :value="sourceIndex > -1 ? sourceIndex : 0" @change="onSourceChange"
					class="full-width-picker" :title="$t('todo.source')">
					<view class="picker-display" :class="{ 'placeholder-color': sourceIndex === -1 }">
						{{ sourceIndex > -1 ? sourceOptions[sourceIndex] : $t('todo.select_source') }}
					</view>
				</AppPicker>

				<text class="arrow-icon">›</text>
			</view>

			<view class="flat-item">
				<view class="item-left">
					<image src="/static/user.png" class="item-icon"></image>
				</view>

				<AppPicker :range="memberOptions" :value="memberIndex" @change="onMemberChange"
					class="full-width-picker" :title="$t('todo.assignee')">
					<view class="picker-display" :class="{ 'placeholder-color': !currentAssigneeName }">
						{{ currentAssigneeName ? currentAssigneeName : $t('todo.assignee') }}
					</view>
				</AppPicker>

				<text class="arrow-icon">›</text>
			</view>

			<TodoDatePicker :class="{ 'theme-dark': isDark }" v-model:dueDate="form.dueDate"
				v-model:notifyAt="form.notifyAt" />
			<view class="footer-action">
				<view style="width: 35%">
					<AppButton type="secondary" :label="$t('common.cancel_action')" @click="goBack" />
				</view>
				<view style="width: 60%">
					<AppButton type="primary" :label="loading ? $t('common.saving') : $t('common.save')"
						:loading="loading" @click="submitForm" />
				</view>
			</view>
		</view>

		<GlobalMessage />
		<GlobalNotification />
	</view>
</template>
<script setup lang="ts">
	import { useCreateTodoController } from '@/controllers/create_todo';
	import TodoEditor from '@/components/Todo/TodoEditor.vue';
	import TodoDatePicker from '@/components/Todo/TodoDatePicker.vue';
	import CustomerModal from '@/components/Todo/CustomerModal.vue';
	import AppButton from '@/components/AppButton.vue';
	import GlobalMessage from '@/components/GlobalMessage.vue';
	import GlobalNotification from '@/components/GlobalNotification.vue';
	import AppPicker from '@/components/AppPicker.vue';
	import { computed } from 'vue';
	import { useAuthStore } from '@/stores/auth';
	const authStore = useAuthStore();
	const isDark = computed(() => authStore.isDark);
	const {
		loading, form, goBack, submitForm,
		memberOptions, onMemberChange, currentAssigneeName,
		showCustomerModal, loadingCustomer, customerList,
		openCustomerPopup, onCustomerSelect,
		sourceOptions,
		sourceIndex,
		onSourceChange,
		memberList,
		onCustomerFilter,
		loadingMore,
		loadMoreCustomers
	} = useCreateTodoController();
	const memberIndex = computed(() => {
		if (!form.value.assignee || !memberList.value.length) return 0;
		const idx = memberList.value.findIndex(m => m.memberUID === form.value.assignee);
		return idx !== -1 ? idx : 0;
	});
</script>

<style lang="scss" scoped>
	@import '@/common/theme.scss';

	.container {
		min-height: 100vh;
		background-color: var(--bg-page);
		display: flex;
		flex-direction: column;
		padding: 0;
		box-sizing: border-box;
		/* Edge-to-edge display */
		padding-bottom: var(--safe-area-inset-bottom, 0px);
	}

	.custom-header {
		height: 44px;
		background-color: var(--bg-surface);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		padding-top: calc(var(--status-bar-height, 20px) + var(--safe-area-inset-top, 0px));
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.content-body {
		flex: 1;
		overflow-y: auto;
		padding: 15px;
	}

	.title-input-group {
		margin-top: 0px;
	}

	.back-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.picker-group-wrapper {
		background-color: var(--bg-surface);
		border-radius: 8px;
		margin-bottom: 12px;
		overflow: hidden;
		border: 1px solid var(--border-color);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	}

	.back-icon {
		width: 20px;
		height: 20px;
		transform: rotate(90deg);
		filter: var(--icon-filter);
	}

	.header-title {
		font-size: 17px;
		font-weight: bold;
		color: var(--text-primary);
	}

	.header-right {
		width: 40px;
	}

	.flat-item {
		background-color: var(--bg-surface);
		margin-bottom: 12px;
		padding: 15px;
		display: flex;
		align-items: center;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.item-left {
		display: flex;
		align-items: center;
		margin-right: 15px;
	}

	.item-icon {
		width: 22px;
		height: 22px;
		opacity: 0.6;
		filter: var(--icon-filter);
	}

	.item-input {
		flex: 1;
		text-align: left;
		font-size: 15px;
		color: var(--text-primary);
		min-height: 24px;
		line-height: 1.4;
		padding: 5px 0;
	}

	.input-placeholder {
		color: var(--text-hint);
	}

	.title-textarea {
		width: 100%;
		overflow: hidden;
	}

	.char-count {
		font-size: 12px;
		color: var(--text-hint);
		margin-left: 10px;
		flex-shrink: 0;
	}

	.full-width-picker {
		flex: 1;
	}

	.picker-display {
		font-size: 15px;
		color: var(--text-primary);
		width: 100%;
	}

	.placeholder-color {
		color: var(--text-hint);
	}

	.footer-action {
	    margin-top: 10px; 
	
	    display: flex;
	    justify-content: space-between;
	    gap: 15px;
	    padding-bottom: calc(10px + var(--safe-area-inset-bottom, 0px));
	}
	.customer-item {
	    margin-top: 12px;
	}
	.input-trigger {
		flex: 1;
		font-size: 15px;
		color: var(--text-primary);
	}

	.input-trigger.placeholder {
		color: var(--text-hint);
	}

	.arrow-icon {
		color: var(--text-hint);
		font-size: 18px;
		margin-left: 5px;
		padding-bottom: 2px;
	}
</style>