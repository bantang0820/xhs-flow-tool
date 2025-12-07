import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AnimationModal from './components/AnimationModal';
import { supabase } from './supabase';


// --- 登录组件 (保持不变) ---
function Auth({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let result;
            if (isSignUp) {
                result = await supabase.auth.signUp({ email, password });
            } else {
                result = await supabase.auth.signInWithPassword({ email, password });
            }
            const { error } = result;
            if (error) throw error;
            if (isSignUp) {
                alert("注册成功！请直接登录。");
                setIsSignUp(false);
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-red-600">{isSignUp ? '加入团队' : '登录心流系统'}</h1>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input className="w-full p-2 border rounded" type="email" placeholder="请输入邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className="w-full p-2 border rounded" type="password" placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button disabled={loading} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50">{loading ? '处理中...' : (isSignUp ? '注册账号' : '登录')}</button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-500 cursor-pointer hover:text-red-600" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? '已有账号？去登录' : '新同事？去注册'}</div>
            </div>
        </div>
    );
}

// --- 主应用 ---
function App() {
    const [session, setSession] = useState(null);
    const [activeTab, setActiveTab] = useState('mission'); // mission, accounts, longterm
    const [accounts, setAccounts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [longTerms, setLongTerms] = useState([]); // 长期运营产品
    const [animationType, setAnimationType] = useState(null); // 动效类型: 'drop', 'retry', 'promoted'

    const [newAccount, setNewAccount] = useState({ phone_id: '', sim_slot: '卡槽 1', account_name: '', note: '', tags: '' });
    const [newTask, setNewTask] = useState({ account_id: '', product_name: '' });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    }, []);

    useEffect(() => {
        if (session) {
            fetchAccounts();
            fetchTasks();
            fetchLongTerms();
        }
    }, [session]);

    // --- Data Fetching ---
    // 权限定义：只要邮箱包含 jack 或者是 admin 就算管理员
    const isJack = session?.user?.email?.toLowerCase().includes('jack') || session?.user?.email?.toLowerCase().includes('admin');

    const fetchAccounts = async () => {
        const { data } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
        setAccounts(data || []);
    };

    const fetchTasks = async () => {
        const { data } = await supabase.from('tasks').select(`*, accounts (account_name, phone_id, sim_slot)`).order('created_at', { ascending: false });
        if (data) {
            // 如果是Jack，看全部；否则只看自己的
            setTasks(isJack ? data : data.filter(t => t.creator_email === session.user.email));
        }
    };

    const fetchLongTerms = async () => {
        const { data } = await supabase.from('long_term_products').select(`*, accounts (account_name, phone_id, sim_slot)`).order('created_at', { ascending: false });
        if (data) {
            // 长期品也要过滤，除非是 Jack
            // 注意：请确保数据库 long_term_products 表已添加 creator_email 字段
            setLongTerms(isJack ? data : data.filter(t => t.creator_email === session.user.email));
        }
    };

    // --- Actions ---
    const handleLogout = async () => await supabase.auth.signOut();

    const handleAddAccount = async () => {
        console.log('handleAddAccount called', newAccount);
        if (!newAccount.account_name) return alert("请输入账号名称！");

        try {
            console.log('Attempting to insert account:', newAccount);
            const { data, error } = await supabase.from('accounts').insert([newAccount]);

            if (error) {
                console.error('Supabase insert error:', error);
                alert(`添加失败: ${error.message}`);
                return;
            }

            console.log('Account inserted successfully:', data);
            setNewAccount({ phone_id: '', sim_slot: '卡槽 1', account_name: '', note: '', tags: '' });
            fetchAccounts();
            alert('账号添加成功！');
        } catch (err) {
            console.error('Unexpected error:', err);
            alert(`添加失败: ${err.message}`);
        }
    };


    const updateAccountStatus = async (id, status, viewCount) => {
        const updates = {};
        if (status) updates.status = status;
        if (viewCount !== null) updates.warming_view_count = viewCount;
        await supabase.from('accounts').update(updates).eq('id', id);
        fetchAccounts();
    };

    const handleAddTask = async (e, prefillData = null) => {
        if (e) e.preventDefault();
        const taskData = prefillData || newTask;
        if (!taskData.account_id || !taskData.product_name) return;

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const safeProductName = taskData.product_name.replace(/\s+/g, '');
        const mission_code = `A${taskData.account_id}-${safeProductName}-${dateStr}`;

        const { error } = await supabase.from('tasks').insert([{
            account_id: taskData.account_id,
            product_name: taskData.product_name,
            mission_code: mission_code,
            creator_email: session.user.email
        }]);

        if (error) {
            alert("创建失败: " + error.message);
        } else {
            setNewTask({ account_id: '', product_name: '' });
            fetchTasks();
            if (prefillData) setActiveTab('mission'); // 如果是从长期运营跳转过来的，切回任务页
        }
    };

    const toggleChecklist = async (task, field) => {
        const newVal = !task[field];

        // 1. 立即在本地更新UI
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, [field]: newVal } : t));

        // 2. 构建更新对象
        const updates = { [field]: newVal };

        // 3. 检查是否所有步骤都完成
        const t = { ...task, [field]: newVal };

        // SOP 6步
        const sopDone = t.check_keywords && t.check_copywriting && t.check_tags && t.check_cover && t.check_photos && t.check_archive;

        // 资料准备 5步
        const prepDone = t.prep_detail_imgs && t.prep_100_titles && t.prep_note_screenshots && t.prep_comment_screenshots && t.prep_final_excel;

        // 只有 SOP 和 资料 都齐了，才流转
        if (sopDone && prepDone && task.status === 'planning') {
            updates.status = 'ready';
        }

        // 4. 发送给服务器
        const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);

        if (error) {
            alert("更新失败，请重试");
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, [field]: !newVal } : t));
        } else {
            if (sopDone && prepDone) {
                setTimeout(() => fetchTasks(), 500);
            }
        }
    };

    const markPublished = async (id) => {
        if (!window.confirm('确认RPA已经执行完毕并发布了吗？')) return;
        await supabase.from('tasks').update({ status: 'published', published_at: new Date() }).eq('id', id);
        fetchTasks();
    };

    // --- Decision & Long Term Actions ---
    const handleDecision = async (task, decision) => {
        // 1. Update task result
        try {
            // Assuming API_BASE is defined elsewhere, e.g., const API_BASE = 'http://localhost:3001/api';
            // For this example, we'll stick to supabase for the update, but trigger animations.
            await supabase.from('tasks').update({ review_result: decision }).eq('id', task.id);

            // 2. Handle specific actions
            if (decision === 'retry') {
                // 显示继续测动效
                setAnimationType('retry');
                // 自动复测：创建一个新任务
                setTimeout(() => {
                    if (window.confirm(`确认要复测 "${task.product_name}" 吗？这将自动创建一个新任务。`)) {
                        handleAddTask(null, { account_id: task.account_id, product_name: task.product_name });
                    }
                }, 2000);
            } else if (decision === 'promoted') {
                // 显示烟花庆祝动效
                setAnimationType('promoted');
                // 晋升长期：添加到 long_term_products 表
                setTimeout(async () => {
                    if (window.confirm(`恭喜！确认将 "${task.product_name}" 晋升为长期运营品吗？`)) {
                        // Assuming API_BASE is defined elsewhere for axios.post
                        // For this example, we'll stick to supabase for the insert.
                        await supabase.from('long_term_products').insert([{
                            account_id: task.account_id,
                            product_name: task.product_name,
                            creator_email: task.creator_email // 传承所有权
                        }]);
                        fetchLongTerms();
                    }
                }, 3500);
            } else if (decision === 'drop') {
                // 显示淘汰鼓励动效
                setAnimationType('drop');
            }
            fetchTasks();
        } catch (err) { alert(err.message); }
    };

    const updateLongTermCheck = async (item, field, isDate = false) => {
        const newVal = isDate ? new Date().toISOString() : !item[field];
        await supabase.from('long_term_products').update({ [field]: newVal }).eq('id', item.id);
        fetchLongTerms();
    };

    // Utils
    const isToday = (dateString) => {
        if (!dateString) return false;
        const today = new Date().toISOString().slice(0, 10);
        return dateString.slice(0, 10) === today;
    };

    const isThisWeek = (dateString) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        const now = new Date();
        const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
        return d > oneWeekAgo;
    };

    if (!session) return <Auth />;

    const activeAccounts = accounts.filter(a => a.status === 'active');
    const planningTasks = tasks.filter(t => t.status === 'planning');
    const readyTasks = tasks.filter(t => t.status === 'ready');
    const publishedTasks = tasks.filter(t => t.status === 'published');

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
            <AnimationModal type={animationType} onClose={() => setAnimationType(null)} />
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-green-600">小红书矩阵心流系统</h1>
                    <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">User: <span className="font-bold text-black">{session.user.email}</span></span>
                        <button onClick={handleLogout} className="text-xs text-red-500 underline">退出</button>
                    </div>
                </div>
                <div className="space-x-4 flex">
                    <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded ${activeTab === 'accounts' ? 'bg-blue-600 text-white' : 'bg-white'}`}>📱 账号资源池</button>
                    <button onClick={() => setActiveTab('mission')} className={`px-4 py-2 rounded ${activeTab === 'mission' ? 'bg-red-600 text-white' : 'bg-white'}`}>🚀 任务指挥塔 (测品)</button>
                    <button onClick={() => setActiveTab('longterm')} className={`px-4 py-2 rounded ${activeTab === 'longterm' ? 'bg-green-600 text-white' : 'bg-white shadow-sm border border-green-200 text-green-700'}`}>🌲 长期运营</button>
                </div>
            </header>

            {/* TAB 1: 账号资源池 */}
            {activeTab === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded shadow h-fit">
                        <h2 className="text-xl font-bold mb-4">录入新账号</h2>
                        <div className="space-y-4">
                            <input className="w-full p-2 border rounded" placeholder="手机编号" value={newAccount.phone_id} onChange={e => setNewAccount({ ...newAccount, phone_id: e.target.value })} />
                            <select className="w-full p-2 border rounded" value={newAccount.sim_slot} onChange={e => setNewAccount({ ...newAccount, sim_slot: e.target.value })}><option>卡槽 1</option><option>卡槽 2</option></select>
                            <input className="w-full p-2 border rounded" placeholder="账号名称" value={newAccount.account_name} onChange={e => setNewAccount({ ...newAccount, account_name: e.target.value })} />
                            <button onClick={handleAddAccount} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">加入</button>
                        </div>
                    </div>
                    <div className="col-span-2 space-y-4">
                        {accounts.map(acc => (
                            <div key={acc.id} className={`p-4 rounded border-l-4 shadow bg-white flex justify-between items-center ${acc.status === 'active' ? 'border-green-500' : acc.status === 'abandoned' ? 'border-gray-500 bg-gray-50' : 'border-yellow-500'}`}>
                                <div><div className="font-bold text-lg">{acc.account_name}</div><div className="text-sm text-gray-500">{acc.phone_id} - {acc.sim_slot} | {acc.status}</div></div>
                                {acc.status === 'warming' && (
                                    <div className="flex items-center space-x-2"><input type="number" placeholder="浏览量" className="border p-1 w-20 rounded" onBlur={(e) => updateAccountStatus(acc.id, null, e.target.value)} /><button onClick={() => updateAccountStatus(acc.id, 'active', acc.warming_view_count)} className="bg-green-500 text-white px-3 py-1 rounded text-sm">达标</button><button onClick={() => updateAccountStatus(acc.id, 'abandoned', acc.warming_view_count)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm">淘汰</button></div>
                                )}
                                {acc.status === 'active' && <span className="text-green-600 font-bold">✅ 合格</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: 任务指挥塔 (测品) */}
            {activeTab === 'mission' && (
                <div className="space-y-8">
                    <div className="bg-white p-4 rounded shadow flex space-x-4 items-end">
                        <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">选择账号</label><select className="w-full p-2 border rounded" value={newTask.account_id} onChange={e => setNewTask({ ...newTask, account_id: e.target.value })}><option value="">--</option>{activeAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
                        <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">产品名</label><input className="w-full p-2 border rounded" placeholder="产品名" value={newTask.product_name} onChange={e => setNewTask({ ...newTask, product_name: e.target.value })} /></div>
                        <button onClick={(e) => handleAddTask(e)} className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700">🔥 启动测品</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 生产中 */}
                        <div className="bg-gray-200 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-700 mb-4">生产中 <span className="float-right bg-white px-2 rounded text-sm">{planningTasks.length}</span></h3>
                            <div className="space-y-3">
                                {planningTasks.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded shadow border-l-4 border-yellow-400">
                                        <div className="font-bold">{task.product_name}</div>
                                        <div className="text-xs bg-gray-100 p-1 mt-1 select-all">{task.mission_code}</div>
                                        <div className="mt-3 border-t pt-2 grid grid-cols-2 gap-4">
                                            {/* 左列：SOP流程 */}
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-400 font-bold mb-1">⚙️ SOP 流程:</div>
                                                {['check_keywords:1.制作标题', 'check_copywriting:2.批量跑正文', 'check_tags:3.确定标签', 'check_cover:4.制作首图', 'check_photos:5.拍摄图片', 'check_archive:6.移交Jack'].map(item => {
                                                    const [key, label] = item.split(':');
                                                    return (
                                                        <label key={key} className={`flex items-center space-x-2 text-xs cursor-pointer ${task[key] ? 'text-green-600 line-through opacity-60' : 'text-gray-600'}`}>
                                                            <input type="checkbox" checked={!!task[key]} onChange={() => toggleChecklist(task, key)} /><span>{label}</span>
                                                        </label>
                                                    )
                                                })}
                                            </div>

                                            {/* 右列：资料准备 */}
                                            <div className="space-y-1 border-l pl-4 border-dashed border-gray-200">
                                                <div className="text-xs text-gray-400 font-bold mb-1">📂 资料清单:</div>
                                                {[
                                                    'prep_detail_imgs:商品详情截图',
                                                    'prep_100_titles:100个爆款标题',
                                                    'prep_note_screenshots:正文截图(5-10)',
                                                    'prep_comment_screenshots:商品评论截图',
                                                    'prep_final_excel:最终标题和正文'
                                                ].map(item => {
                                                    const [key, label] = item.split(':');
                                                    return (
                                                        <label key={key} className={`flex items-center space-x-2 text-xs cursor-pointer ${task[key] ? 'text-blue-600 line-through opacity-60' : 'text-gray-600'}`}>
                                                            <input type="checkbox" checked={!!task[key]} onChange={() => toggleChecklist(task, key)} /><span>{label}</span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 待发布 */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-bold text-blue-800 mb-4">待发布 (Jack) <span className="float-right bg-white px-2 rounded text-sm">{readyTasks.length}</span></h3>
                            <div className="space-y-3">
                                {readyTasks.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                                        <div className="font-bold text-lg">{task.product_name}</div>
                                        <div className="text-sm text-blue-600 mt-1">{task.accounts?.phone_id} / {task.accounts?.sim_slot}</div>
                                        <div className="bg-gray-800 text-white p-2 rounded mt-2 text-xs font-mono cursor-pointer" onClick={() => navigator.clipboard.writeText(task.mission_code)}>📂 {task.mission_code} (复制)</div>
                                        <button onClick={() => markPublished(task.id)} className="w-full mt-2 bg-green-600 text-white py-2 rounded font-bold">🚀 确认发布</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 复盘区 (新增决策功能) */}
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-600 mb-4">复盘与决策</h3>
                            <div className="space-y-2">
                                {publishedTasks.slice(0, 20).map(task => (
                                    <div key={task.id} className={`bg-white p-3 rounded border ${task.review_result === 'promoted' ? 'border-green-500 bg-green-50' : task.review_result === 'drop' ? 'border-red-200 opacity-60' : 'border-gray-200'}`}>
                                        <div className="font-medium flex justify-between">
                                            <span>{task.product_name}</span>
                                            <span className="text-xs bg-gray-200 px-1 rounded">{task.mission_code.slice(-4)}</span>
                                        </div>
                                        {task.review_result ? (
                                            <div className="mt-2 text-xs font-bold text-center uppercase p-1 rounded bg-gray-100 text-gray-500">
                                                {task.review_result === 'drop' && '❌ 已淘汰'}
                                                {task.review_result === 'retry' && '🔄 已安排复测'}
                                                {task.review_result === 'promoted' && '🌲 晋升长期'}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-1 mt-2">
                                                <button onClick={() => handleDecision(task, 'drop')} className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs py-1 rounded">淘汰</button>
                                                <button onClick={() => handleDecision(task, 'retry')} className="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs py-1 rounded">继续测</button>
                                                <button onClick={() => handleDecision(task, 'promoted')} className="bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1 rounded font-bold">转长期</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: 长期运营 (Long Term) */}
            {activeTab === 'longterm' && (
                <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-green-800 border-b pb-2">🌲 长期运营看板</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {longTerms.map(item => (
                            <div key={item.id} className="bg-white rounded-lg shadow-lg border-t-4 border-green-600 overflow-hidden">
                                <div className="p-4 bg-green-50 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-xl text-green-900">{item.product_name}</div>
                                        <div className="text-xs text-green-700 mt-1">{item.accounts?.account_name}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('要为此长期品发一篇新笔记吗？这将跳转到任务指挥塔。')) {
                                                handleAddTask(null, { account_id: item.account_id, product_name: item.product_name });
                                            }
                                        }}
                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm shadow hover:bg-green-700"
                                    >
                                        + 发新帖
                                    </button>
                                </div>

                                <div className="p-4 space-y-6">
                                    {/* 基建任务 */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">一次性基建</h4>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm">
                                                <input type="checkbox" checked={!!item.setup_library} onChange={() => updateLongTermCheck(item, 'setup_library')} />
                                                <span className={item.setup_library ? 'text-gray-400 line-through' : ''}>整理评论库</span>
                                            </label>
                                            <label className="flex items-center space-x-2 text-sm">
                                                <input type="checkbox" checked={!!item.setup_20_reviews} onChange={() => updateLongTermCheck(item, 'setup_20_reviews')} />
                                                <span className={item.setup_20_reviews ? 'text-gray-400 line-through' : ''}>刷20个带图好评</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 日常任务 */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">每日必做 (Daily)</h4>
                                        <div
                                            onClick={() => updateLongTermCheck(item, 'last_daily_check', true)}
                                            className={`border rounded p-3 cursor-pointer transition-colors flex items-center justify-between ${isToday(item.last_daily_check) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                                        >
                                            <div>
                                                <div className="font-bold text-sm">🔍 查昨日单量 ({'>'}3单)</div>
                                                <div className="text-xs mt-1">安排补单+补评论</div>
                                            </div>
                                            <div className="text-2xl">{isToday(item.last_daily_check) ? '✅' : '⬜'}</div>
                                        </div>
                                    </div>

                                    {/* 周常任务 */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">每周必做 (Weekly)</h4>
                                        <div
                                            onClick={() => updateLongTermCheck(item, 'last_weekly_cover', true)}
                                            className={`border rounded p-3 cursor-pointer transition-colors flex items-center justify-between ${isThisWeek(item.last_weekly_cover) ? 'bg-green-50 border-green-200 text-gray-600' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}
                                        >
                                            <div className="text-sm">🖼️ 更新封面</div>
                                            <div className="text-sm">{isThisWeek(item.last_weekly_cover) ? '本周已做' : '⚠️ 待更新'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {longTerms.length === 0 && (
                            <div className="col-span-3 text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                                暂无长期运营产品。请去“任务指挥塔”的复盘区，将表现好的产品“转长期”。
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
