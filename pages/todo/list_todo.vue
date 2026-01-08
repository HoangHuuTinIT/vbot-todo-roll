<template>
	<view class="container" :class="{ 'theme-dark': isDark }">
		<view class="header">
			<view class="status-bar-spacer" :style="{ height: statusBarHeight + 'px' }"></view>

			<view class="nav-bar">
				<view class="header-left" @click="onBack">
					<uni-icons type="left" size="24" :color="isDark ? '#ffffff' : '#333333'"></uni-icons>
				</view>

				<text class="header-title">{{ $t('todo.page_title') }}</text>

				<view class="header-right">
					<view class="icon-btn" @click="openQuickComplete" style="margin-right: 15px;">
						<image src="/static/checked-checkbox.png" class="filter-icon" mode="aspectFit"></image>
					</view>

					<view class="icon-btn" @click="openFilter">
						<image src="/static/filter.png" class="filter-icon"></image>
					</view>
				</view>
			</view>
		</view>

		<view class="content">
			<view class="list-wrapper">
				<scroll-view scroll-y class="list-view" :upper-threshold="50" :lower-threshold="200"
					@scrolltolower="onScrollToLower" @scrolltoupper="onScrollToUpper" @scroll="onScroll"
					:scroll-top="scrollTop" :scroll-with-animation="enableScrollAnimation"
					:refresher-enabled="startPage === 1 && !isLoadingPrev && !isRestoringScroll && !isRefresherLocked" :refresher-threshold="50" refresher-background="transparent"
					:refresher-triggered="isRefreshing" @refresherrefresh="onRefresh">
					<view class="list-view-content-measurer">

						<view v-if="isLoadingPrev" class="loading-state load-prev py-2">
							<image src="/static/loading-dots.gif" class="icon-small" v-if="false" /> 
							<text>{{ $t('common.loading') }}...</text>
						</view>

						<view v-if="!isLoadingPrev && isLoading && todos.length === 0" class="loading-state">
							<text>{{ $t('common.loading') }}</text>
						</view>

						<view v-else-if="todos.length === 0" class="empty-state">
							<image src="/static/empty-box.png" mode="aspectFit" class="empty-icon"></image>
							<text class="empty-text">{{ $t('common.no_data') }}</text>
						</view>

						<view v-else>
							<view v-for="(item, index) in todos" :key="item.id || index" class="card-item"
								@click="goToDetail(item)">
								<view class="status-bar" :class="item.statusClass"></view>

								<view class="card-body">
									<view class="card-row top-row">
										<text class="card-title">#{{ item.code }} - {{ item.title }}</text>
										<view class="action-btn" @click.stop="openCustomMenu(item)">
											<text class="dots">⋮</text>
										</view>
									</view>

									<view class="card-info-row">
										<image src="/static/create-time.png" class="icon-small"></image>
										<text class="card-date">
											{{ $t('todo.created_at') }}: {{ item.createdAtFormatted }}
										</text>
									</view>

									<view class="card-info-row" v-if="item.dueDateFormatted">
										<image src="/static/due-time.png" class="icon-small"></image>
										<text class="card-date text-danger">
											{{ $t('todo.expired_at') }}: {{ item.dueDateFormatted }}
										</text>
									</view>

									<view class="card-info-row" v-if="item.notifyAtFormatted">
										<image src="/static/notify-time.png" class="icon-small"></image>
										<text class="card-date text-primary">
											{{ $t('todo.notify_at') }}: {{ item.notifyAtFormatted }}
										</text>
									</view>

									<view class="card-row bot-row">
										<view class="code-tag">#{{ item.code }}</view>
										<StatusBadge :status="item.status" />
									</view>
								</view>
							</view>

							<view v-if="isLoadingMore" class="loading-more">
								<text class="loading-text">{{ $t('common.loading_more') }}...</text>
							</view>

							<view style="height: 20px;"></view>
						</view>
					</view>
				</scroll-view>

				<view class="pagination-drawer" :class="{ 'expanded': isPaginationExpanded }">
					<view class="pagination-handle" @click="togglePagination">
						<text class="current-page-badge">{{ activePage }}</text> <text class="handle-icon"
							v-if="!isPaginationExpanded">‹</text>
						<text class="handle-icon" v-else>›</text>
					</view>

					<scroll-view scroll-y class="pagination-list" v-if="isPaginationExpanded">
						<view class="page-title">{{ $t('common.page') }}</view>
						<view v-for="p in totalPages" :key="p" class="page-number-item"
							:class="{ 'active': p === activePage, 'loaded': p <= pageNo }" @click="handleJumpToPage(p)">
							{{ p }}
						</view>
						<view style="height: 20px;"></view>
					</scroll-view>
				</view>
			</view>

			<view class="pagination-footer">
				<AppPicker :range="pageSizeStringOptions || pageSizeOptions" :value="pageSizeIndex"
					@change="onUpdatePageSizeUI" :title="$t('common.page_unit')">
					<view class="page-size-selector">
						<text class="size-text">{{ pageSize }} / {{ $t('common.page_unit') }}</text>
						<text class="dropdown-arrow">▼</text>
					</view>
				</AppPicker>

				<text class="total-text">{{ $t('common.total') }}: {{ totalCount }}</text>

				<view class="add-task-simple" @click="addNewTask">
					<text class="plus-icon">+</text>
					<text class="add-text">{{ $t('todo.add_task') }}</text>
				</view>
			</view>
		</view>

		<view class="filter-overlay" v-if="isFilterOpen" @click.stop="closeFilter">
			<view class="filter-panel" @click.stop>
				<view class="filter-header">
					<text class="filter-title">{{ $t('todo.filter_title') }}</text>
					<text class="close-btn" @click="closeFilter">✕</text>
				</view>

				<scroll-view scroll-y class="filter-body">
					<view class="f-group">
						<text class="f-label">{{ $t('todo.search_label') }}</text>
						<input class="f-input" v-model="filter.title" :placeholder="$t('todo.search_placeholder')"
							:placeholder-class="'input-placeholder'" />
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.code_prefix') }}</text>
						<input class="f-input" v-model="filter.jobCode" :placeholder="$t('todo.job_code_placeholder')"
							:placeholder-class="'input-placeholder'" />
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.status') }}</text>
						<AppPicker :range="statusOptions" :value="statusIndex" @change="onStatusChange"
							:title="$t('todo.status')">
							<view class="f-picker">
								{{ statusOptions[statusIndex] }} <text class="arrow">▼</text>
							</view>
						</AppPicker>
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.creator') }}</text>
						<AppPicker :range="creatorOptions" :value="creatorIndex" @change="onCreatorChange"
							:title="$t('todo.creator')">
							<view class="f-picker">
								{{ creatorOptions[creatorIndex] }} <text class="arrow">▼</text>
							</view>
						</AppPicker>
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.customer') }}</text>
						<view class="f-input" @click="openCustomerPopup" style="justify-content: space-between;">
							<text :class="selectedCustomerName ? 'text-filled' : 'text-empty'">
								{{ selectedCustomerName || $t('todo.select_customer') }}
							</text>
							<text class="arrow">›</text>
						</view>
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.assignee') }}</text>
						<AppPicker :range="assigneeOptions" :value="assigneeIndex" @change="onAssigneeChange"
							:title="$t('todo.assignee')">
							<view class="f-picker">
								{{ assigneeOptions[assigneeIndex] }} <text class="arrow">▼</text>
							</view>
						</AppPicker>
					</view>

					<view class="f-group">
						<text class="f-label">{{ $t('todo.source') }}</text>
						<AppPicker :range="sourceOptions" :value="sourceIndex" @change="onSourceChange"
							:title="$t('todo.source')">
							<view class="f-picker">
								{{ sourceOptions[sourceIndex] }} <text class="arrow">▼</text>
							</view>
						</AppPicker>
					</view>

					<DateRangeFilter :title="$t('todo.time_create')" v-model:startDate="filter.createdFrom"
						v-model:endDate="filter.createdTo" />

					<DateRangeFilter :title="$t('todo.time_expired')" v-model:startDate="filter.dueDateFrom"
						v-model:endDate="filter.dueDateTo" />

					<DateRangeFilter :title="$t('todo.time_notify')" v-model:startDate="filter.notifyFrom"
						v-model:endDate="filter.notifyTo" />

					<view style="height: 20px;"></view>
				</scroll-view>

				<view class="filter-footer">
					<AppButton type="secondary" :label="$t('common.reset')" @click="resetFilter" />
					<AppButton type="primary" :label="$t('common.apply')" @click="applyFilter" />
				</view>
			</view>
		</view>

		<view class="filter-overlay" v-if="isQuickCompleteOpen" @click.stop="closeQuickComplete">
			<view class="filter-panel quick-panel" @click.stop>
				<view class="filter-header">
					<text class="filter-title">{{ $t('todo.quick_done_title') }}</text>
					<text class="close-btn" @click="closeQuickComplete">✕</text>
				</view>

				<scroll-view scroll-y class="filter-body">
					<view v-if="isLoadingQuick" class="loading-state" style="height: 200px;">
						<text>{{ $t('common.loading') }}</text>
					</view>

					<view v-else-if="quickTodos.length === 0" class="empty-state" style="height: 200px;">
						<text class="empty-text">{{ $t('todo.msg_no_task_quick_done') }}</text>
					</view>

					<view v-else class="quick-list">
						<view v-for="item in quickTodos" :key="item.id" class="quick-item">
							<view class="quick-info">
								<view class="quick-code">#{{ item.code }}</view>
								<view class="quick-title">{{ item.title }}</view>
							</view>

							<view class="quick-action">
								<button class="btn-complete" @click.stop="handleQuickMarkDone(item)">
									<text>{{ $t('todo.done_action') }}</text>
								</button>
							</view>
						</view>
						<view style="height: 40px;"></view>
					</view>
				</scroll-view>
			</view>
		</view>

		<CustomerModal :visible="showCustomerModal" :loading="loadingCustomer" :loadingMore="loadingMore"
			:customers="customerList" :managers="rawMemberList" @close="showCustomerModal = false"
			@select="onCustomerSelect" @filter="onFilterCustomerInModal" @loadMore="loadMoreCustomers" />

		<ConfirmModal v-model:visible="isConfirmDeleteOpen" :title="$t('common.notification')"
			:message="itemToDelete ? $t('todo.confirm_delete_msg', { title: itemToDelete.title }) : ''"
			confirm-type="danger" :cancel-label="$t('common.cancel')" :confirm-label="$t('common.delete')"
			@confirm="confirmDelete" @cancel="cancelDelete" />

		<view class="custom-sheet-mask" :class="{ show: showCustomActionSheet }" @click="showCustomActionSheet = false">
			<view class="custom-sheet-panel" @click.stop>
				<view class="sheet-item delete" @click="handleCustomAction('delete')">
					<text>{{ $t('common.delete') }}</text>
				</view>

				<view class="sheet-gap"></view>

				<view class="sheet-item cancel" @click="showCustomActionSheet = false">
					<text>{{ $t('common.cancel') }}</text>
				</view>
			</view>
		</view>

		<GlobalMessage />
		<GlobalNotification />

	</view>
</template>
<script setup lang="ts">
	import { ref, computed, watch, onMounted, nextTick, getCurrentInstance } from 'vue';
	import CustomerModal from '@/components/Todo/CustomerModal.vue';
	import { useListTodoController } from '@/controllers/list_todo';
	import StatusBadge from '@/components/StatusBadge.vue';
	import DateRangeFilter from '@/components/DateRangeFilter.vue';
	import AppButton from '@/components/AppButton.vue';
	import GlobalMessage from '@/components/GlobalMessage.vue';
	import ConfirmModal from '@/components/ConfirmModal.vue';
	import GlobalNotification from '@/components/GlobalNotification.vue';
	import AppPicker from '@/components/AppPicker.vue';
	import { useI18n } from 'vue-i18n';
	import { useAuthStore } from '@/stores/auth';

	const instance = getCurrentInstance();
	const authStore = useAuthStore();
	const isDark = computed(() => authStore.isDark);

	const scrollTop = ref(0);
	const lastScrollTop = ref(0);
	const enableScrollAnimation = ref(true);

	const onBack = () => {
		const pages = getCurrentPages();
		if (pages.length > 1) {
			uni.navigateBack({
				delta: 1
			});
		} else {
			/* #ifdef APP-PLUS */
			plus.runtime.quit();
			/* #endif */
			/* #ifndef APP-PLUS */
			// Check if running in Android WebView with our interface
			if (typeof (window as any).Android !== 'undefined' && (window as any).Android.closeMiniApp) {
				(window as any).Android.closeMiniApp();
			} else {
				history.back();
			}
			/* #endif */
		}
	};
	const statusBarHeight = ref(20);
	onMounted(() => {
		const sysInfo = uni.getSystemInfoSync();
		if (sysInfo.statusBarHeight) {
			statusBarHeight.value = sysInfo.statusBarHeight;
		}
		updateStatusBar();
	});
	const updateStatusBar = () => {
		if (isDark.value) {
			uni.setNavigationBarColor({
				frontColor: '#ffffff',
				backgroundColor: '#000000'
			});
		} else {
			uni.setNavigationBarColor({
				frontColor: '#000000',
				backgroundColor: '#ffffff'
			});
		}
	};

	watch(isDark, () => {
		updateStatusBar();
	});

	const {
		activePage,
		onLoadMore, onChangePageSize, jumpToPage, updateActivePage,
		todos, isLoading, isFilterOpen, filter,
		isConfirmDeleteOpen, itemToDelete,
		pageSizeOptions, currentPage, totalPages, onPageSizeChange, changePage,
		statusOptions, statusIndex, onStatusChange,
		creatorOptions, creatorIndex, onCreatorChange,
		customerOptions, customerIndex, onCustomerChange,
		assigneeOptions, assigneeIndex, onAssigneeChange,
		sourceOptions, sourceIndex, onSourceChange,
		addNewTask, openFilter, closeFilter, resetFilter, applyFilter,
		showActionMenu, cancelDelete, confirmDelete, goToDetail,
		showCustomerModal, loadingCustomer, customerList, selectedCustomerName,
		openCustomerPopup, onCustomerSelect, onFilterCustomerInModal,
		pageNo, pageSize,
		totalCount,
		onChangePage,
		onUpdatePageSize,
		rawMemberList,
		loadingMore,
		loadMoreCustomers,
		isQuickCompleteOpen,
		quickTodos,
		isLoadingQuick,
		openQuickComplete,
		closeQuickComplete,
		handleQuickMarkDone,
		startPage,
		isLoadingPrev,
		isLoadingMore, 
		onLoadPrev,
		isRefreshing,
		onRefresh,
		debugLogs, addLog
	} = useListTodoController();
	const isRestoringScroll = ref(false);
	const isRefresherLocked = ref(false);

	const onScrollToUpper = async () => {
		addLog(`[UI] ScrollToUpper: startPage=${startPage.value}, loading=${isLoading.value}, prev=${isLoadingPrev.value}, restore=${isRestoringScroll.value}, lock=${isRefresherLocked.value}`);
		if (isLoadingPrev.value || isLoading.value || startPage.value <= 1 || isRestoringScroll.value || isRefresherLocked.value) return;

		console.log("Trigger Load Prev Page:", startPage.value - 1);
		isRestoringScroll.value = true; 
		isRefresherLocked.value = true; 

		const query = uni.createSelectorQuery().in(instance);
		query.select('.list-view-content-measurer').boundingClientRect(rect => {
			if (!rect) {
				isRestoringScroll.value = false;
				isRefresherLocked.value = false;
				return;
			}
			const oldHeight = rect.height;

			onLoadPrev().then(() => {
				addLog(`[UI] onLoadPrev success. Calculating new height...`);
				nextTick(() => {
					setTimeout(() => {
						const queryNew = uni.createSelectorQuery().in(instance);
						queryNew.select('.list-view-content-measurer').boundingClientRect(newRect => {
							if (!newRect) {
								isRestoringScroll.value = false;
								isRefresherLocked.value = false;
								return;
							}

							const newHeight = newRect.height;
							const heightDifference = newHeight - oldHeight;

							console.log(`Old: ${oldHeight}, New: ${newHeight}, Diff: ${heightDifference}`);
							
							enableScrollAnimation.value = false;
							scrollTop.value = heightDifference;

							requestAnimationFrame(() => {
								requestAnimationFrame(() => {
									enableScrollAnimation.value = true;
									isRestoringScroll.value = false; 
								});
							});
							setTimeout(() => {
								isRefresherLocked.value = false;
							}, 800);

						}).exec();
					}, 50);
				});

			}).catch((e) => {
				addLog(`[UI] Load Prev Error: ${e}`);
				isRestoringScroll.value = false;
				isRefresherLocked.value = false;
			}).finally(() => {
				setTimeout(() => {
					if (isRestoringScroll.value) {
						addLog(`[UI] Forcing Unlock (Safety Timeout)`);
						isRestoringScroll.value = false;
						isRefresherLocked.value = false;
						enableScrollAnimation.value = true;
					}
				}, 2000);
			});
		}).exec();
	};


	const showCustomActionSheet = ref(false);
	const selectedItemForAction = ref<any>(null);

	const openCustomMenu = (item : any) => {
		selectedItemForAction.value = item;
		showCustomActionSheet.value = true;
	};

	const handleCustomAction = (action : string) => {
		showCustomActionSheet.value = false;
		if (action === 'delete') {
			itemToDelete.value = selectedItemForAction.value;
			isConfirmDeleteOpen.value = true;
		}
	};
	const isPaginationExpanded = ref(false);

	const pageSizeStringOptions = computed(() => pageSizeOptions.map(opt => String(opt)));
	const pageSizeIndex = computed(() => {
		const idx = pageSizeOptions.indexOf(pageSize.value);
		return idx !== -1 ? idx : 0;
	});
	const togglePagination = () => {
		isPaginationExpanded.value = !isPaginationExpanded.value;
	};
	const onScrollToLower = () => {
		console.log("Load more triggered...");
		onLoadMore();
	};
	const onUpdatePageSizeUI = (e : any) => {
		const index = e.detail.value;
		if (pageSizeOptions[index]) {
			scrollTop.value = lastScrollTop.value;
			setTimeout(() => { scrollTop.value = 0; }, 10);
			onUpdatePageSize(pageSizeOptions[index]);
		}
	};
	const handleJumpToPage = (page : number) => {
		isPaginationExpanded.value = false;
		
		jumpToPage(page).then((jumpToIndex) => {
			if (jumpToIndex === null) return;
			
			nextTick(() => {
				setTimeout(() => {

					if (jumpToIndex === 0) {
						scrollTop.value = lastScrollTop.value;
						setTimeout(() => { scrollTop.value = 0; }, 10);
					} else {

						
						const query = uni.createSelectorQuery().in(instance);
						query.selectAll('.card-item').boundingClientRect(rects => {
							if (Array.isArray(rects) && rects.length > jumpToIndex) {

								let offset = 0;
								for(let i=0; i<jumpToIndex; i++) {
									offset += rects[i].height + 15;
								}
								offset += 15;
								offset += 5; 
								
								scrollTop.value = lastScrollTop.value;
								setTimeout(() => { scrollTop.value = offset; }, 10);
							} else {
								const estHeight = 135;
								const offset = jumpToIndex * estHeight + 5;
								scrollTop.value = lastScrollTop.value;
								setTimeout(() => { scrollTop.value = offset; }, 10);
							}
						}).exec();
					}
				}, 100);
			});
		});
	};
	const onScroll = (e : any) => {
		lastScrollTop.value = e.detail.scrollTop;
		if (todos.value.length === 0) return;
		
		const scrollHeight = e.detail.scrollHeight || 0;
		const avgItemHeight = scrollHeight > 0 ? (scrollHeight / todos.value.length) : 120;
		
		const currentIndex = Math.floor(e.detail.scrollTop / avgItemHeight);

		if (currentIndex >= 0) {
			const relativeIndex = Math.min(currentIndex, todos.value.length - 1);
			const p = Math.ceil((todos.value.length) / pageSize.value);
			const currentChunk = Math.floor(relativeIndex / pageSize.value);
			const viewingPage = startPage.value + currentChunk;

			if (viewingPage > 0 && viewingPage <= totalPages.value) {
				updateActivePage(viewingPage);
				activePage.value = viewingPage;
			}
		}
	};
</script>

<style lang="scss" scoped>
	.list-view-content-measurer {
	    display: flex;
	    flex-direction: column;
	    padding-top: 15px; 
	    padding-bottom: 15px; 
	}

	.py-2 {
		padding-top: 8px;
		padding-bottom: 8px;
	}

	.load-prev-wrapper {
		padding: 10px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--bg-surface);
		margin-bottom: 10px;
		border-radius: 8px;
		cursor: pointer;
	}

	.prev-btn {
		display: flex;
		align-items: center;
		color: #007aff;
		font-size: 13px;
		font-weight: 600;
	}

	.prev-icon {
		margin-right: 5px;
		font-size: 16px;
	}

	.loading-state.load-prev {
		height: auto;
		padding: 10px 0;
		font-size: 13px;
		flex-direction: row;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--bg-page);
		overflow: hidden;
	}

	.header {
		background-color: var(--bg-surface);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
	}

	.status-bar-spacer {
		width: 100%;
		height: var(--status-bar-height);
		background-color: transparent;
	}

	.nav-bar {
		height: 50px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px 0 10px;
		box-sizing: border-box;
	}

	.header-left {
		width: 40px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.header-title {
		font-size: 20px;
		font-weight: bold;
		color: var(--text-primary);
		flex: 1;
		text-align: center;
		margin-right: 10px;
	}

	.header-right {
		width: 60px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.filter-icon {
		width: 24px;
		height: 24px;
		filter: var(--icon-filter);
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.list-container {
		flex: 1;
		padding: 15px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.fixed-footer {
		flex-shrink: 0;
		background-color: var(--bg-surface);
		padding: 10px 15px;
		padding-bottom: calc(10px + env(safe-area-inset-bottom));
		border-top: 1px solid var(--border-color);
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-size-selector {
		display: flex;
		align-items: center;
		border: 1px solid var(--border-input);
		border-radius: 4px;
		padding: 4px 8px;
		background-color: var(--bg-input);
	}

	.size-text {
		font-size: 12px;
		color: var(--text-primary);
		margin-right: 4px;
	}

	.total-text {
		font-size: 12px;
		color: var(--text-hint);
	}

	.dropdown-arrow {
		font-size: 10px;
		color: var(--text-secondary);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.page-arrow {
		font-size: 18px;
		color: var(--text-secondary);
		padding: 0 10px;
		font-weight: bold;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.page-arrow.disabled {
		opacity: 0.3;
		pointer-events: none;
	}

	.page-box {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-input);
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-primary);
	}

	.page-box.active {
		background-color: #2dce89;
		color: #fff;
		border-color: #2dce89;
		font-weight: bold;
	}

	.add-task-simple {
		display: flex;
		align-items: center;
		color: #007aff;
		padding: 5px 10px;
		
	}

	.add-task-simple:active {
		opacity: 0.6;
	}

	.plus-icon {
		font-size: 20px;
		margin-right: 4px;
		line-height: 1;
	}

	.add-text {
		font-size: 14px;
		font-weight: 600;
	}

	.list-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.list-view {
		height: 100%;
		width: 100%;
		padding: 0 15px;
		box-sizing: border-box;
	}

	.debug-console {
		position: fixed;
		bottom: 100px;
		left: 10px;
		right: 10px;
		height: 200px;
		background: rgba(0, 0, 0, 0.85);
		border-radius: 8px;
		z-index: 9999;
		border: 1px solid #333;
		pointer-events: none;
	}
	.debug-line {
		color: #00ff00;
		font-size: 11px;
		font-family: monospace;
		margin-bottom: 2px;
		line-height: 1.4;
		text-shadow: 1px 1px 1px #000;
	}


	.pagination-drawer {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%) translateX(100%);
		background-color: var(--bg-surface);
		box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
		border-top-left-radius: 12px;
		border-bottom-left-radius: 12px;
		transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
		z-index: 100;
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		max-height: 70%;
	}

	.pagination-drawer .pagination-handle {
		position: absolute;
		left: -40px;
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 50px;
		background-color: var(--bg-surface);
		border-top-left-radius: 25px;
		border-bottom-left-radius: 25px;
		box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 101;
	}

	.pagination-drawer.expanded {
		transform: translateY(-50%) translateX(0);
	}

	.current-page-badge {
		font-size: 14px;
		font-weight: bold;
		color: #2dce89;
		margin-bottom: 2px;
	}

	.handle-icon {
		font-size: 18px;
		color: var(--text-secondary);
		line-height: 1;
	}

	.pagination-list {
		width: 60px;
		max-height: 400px;
		padding: 10px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.95);
	}

	.theme-dark .pagination-list {
		background-color: #1e1e1e;
	}

	.page-title {
		font-size: 10px;
		color: var(--text-hint);
		text-align: center;
		margin-bottom: 5px;
	}

	.page-number-item {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 5px auto;
		border-radius: 50%;
		font-size: 14px;
		color: var(--text-primary);
		transition: all 0.2s;
	}

	.page-number-item.loaded {
		background-color: rgba(0, 0, 0, 0.03);
	}

	.page-number-item.active {
		background-color: #2dce89;
		color: #fff;
		font-weight: bold;
		transform: scale(1.1);
		box-shadow: 0 2px 5px rgba(45, 206, 137, 0.3);
	}

	.card-item {
		background-color: var(--bg-surface);
		border-radius: 12px;
		margin-bottom: 15px;
		padding: 0;
		position: relative;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.loading-more {
		padding: 15px;
		text-align: center;
	}

	.loading-text {
		font-size: 12px;
		color: var(--text-hint);
	}

	.status-bar {
		width: 6px;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}

	.pagination-footer {
		flex-shrink: 0;
		background-color: var(--bg-surface);
		padding: 10px 15px;
		padding-bottom: calc(10px + env(safe-area-inset-bottom));
		border-top: 1px solid var(--border-color);
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 90;
	}

	.card-body {
		padding: 15px 15px 15px 20px;
	}

	.card-row {
		display: flex;
		align-items: center;
		margin-bottom: 8px;
	}

	.top-row {
		margin-bottom: 8px;
		align-items: flex-start;
		justify-content: space-between;
	}

	.card-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
		line-height: 1.4;
		padding-right: 10px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: normal;
		word-break: break-word;
	}

	.action-btn {
		padding: 0 5px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dots {
		font-size: 28px;
		color: var(--text-hint);
		font-weight: bold;
	}

	.card-info-row {
		display: flex;
		align-items: center;
		margin-bottom: 6px;
	}

	.icon-small {
		width: 14px;
		height: 14px;
		margin-right: 8px;
		opacity: 0.7;
		flex-shrink: 0;
	}

	.card-date {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.bot-row {
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px dashed var(--border-color);
	}

	.code-tag {
		background-color: var(--bg-tag);
		color: var(--text-highlight);
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	.empty-state,
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 300px;
		color: var(--text-hint);
	}

	.empty-text {
		color: var(--text-hint);
	}

	.empty-icon {
		width: 80px;
		height: 80px;
		margin-bottom: 20px;
	}

	.filter-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 999;
		display: flex;
		justify-content: flex-end;
	}

	.filter-panel {
		width: 85%;
		height: 100%;
		background-color: var(--bg-surface);
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}

		to {
			transform: translateX(0);
		}
	}

	.filter-header {
		padding: 40px 20px 20px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border-color);
		font-weight: bold;
		font-size: 18px;
	}

	.filter-title {
		color: var(--text-primary);
		font-weight: bold;
		font-size: 18px;
	}

	.close-btn {
		font-size: 24px;
		padding: 5px;
		color: var(--text-secondary);
	}

	.filter-body {
		flex: 1;
		height: 1px;
		width: 100%;
		padding: 20px;
		box-sizing: border-box;
	}

	.f-group {
		margin-bottom: 15px;
	}

	.f-label {
		font-size: 13px;
		color: var(--text-secondary);
		margin-bottom: 5px;
		display: block;
	}

	.f-input,
	.f-picker {
		background-color: var(--bg-input);
		border: 1px solid var(--border-input);
		color: var(--text-primary);
		border-radius: 8px;
		padding: 10px;
		font-size: 14px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.f-section-title {
		margin-top: 20px;
		margin-bottom: 10px;
		font-weight: bold;
		font-size: 14px;
		color: #009688;
		border-top: 1px dashed var(--border-color);
		padding-top: 15px;
	}

	.f-row {
		display: flex;
		justify-content: space-between;
	}

	.half {
		width: 48%;
	}

	.arrow {
		font-size: 10px;
		color: var(--text-hint);
	}

	.date {
		color: var(--text-primary);
	}

	.filter-footer {
		padding: 20px;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		background-color: var(--bg-surface);
		gap: 15px;
	}

	.btn-filter-reset {
		width: 35%;
	}

	.btn-filter-apply {
		width: 60%;
	}

	@keyframes popIn {
		from {
			transform: scale(0.9);
			opacity: 0;
		}

		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.modal-btn::after {
		border: none;
	}

	.modal-btn.cancel {
		color: var(--text-secondary);
		border-right: 1px solid var(--border-color);
	}

	.modal-btn.confirm {
		color: #ff3b30;
		font-weight: bold;
	}

	.modal-btn:active {
		background-color: var(--bg-input);
	}

	.add-task-simple {
		display: flex;
		align-items: center;
		color: #007aff;
		padding: 5px 0;
		margin-left: 10px;
	}

	.custom-sheet-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 9999;
		visibility: hidden;
		opacity: 0;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.custom-sheet-mask.show {
		visibility: visible;
		opacity: 1;
	}

	.custom-sheet-panel {
		background-color: var(--bg-page);
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
		transform: translateY(100%);
		transition: transform 0.2s;
		overflow: hidden;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.custom-sheet-mask.show .custom-sheet-panel {
		transform: translateY(0);
	}

	.sheet-item {
		background-color: var(--bg-surface);
		padding: 16px;
		text-align: center;
		font-size: 17px;
		border-bottom: 1px solid var(--border-color);
		color: var(--text-primary);
	}

	.sheet-item:active {
		background-color: var(--bg-input);
	}

	.sheet-item.delete text {
		color: #ff3b30;
	}

	.sheet-item.cancel {
		font-weight: 600;
	}

	.sheet-gap {
		height: 8px;
		background-color: var(--bg-page);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
	}

	.quick-panel {
		background-color: var(--bg-page);
	}

	.quick-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.quick-item {
		background-color: var(--bg-surface);
		padding: 12px 15px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.quick-info {
		flex: 1;
		padding-right: 10px;
		overflow: hidden;
	}

	.quick-code {
		font-size: 12px;
		color: var(--text-secondary);
		font-weight: bold;
		background-color: var(--bg-tag);
		display: inline-block;
		padding: 2px 6px;
		border-radius: 4px;
		margin-bottom: 4px;
	}

	.quick-title {
		font-size: 15px;
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.quick-action {
		flex-shrink: 0;
	}

	.btn-complete {
		background-color: #2dce89;
		color: #fff;
		font-size: 12px;
		padding: 0 12px;
		height: 30px;
		line-height: 30px;
		border-radius: 15px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-complete:active {
		opacity: 0.8;
	}
</style>