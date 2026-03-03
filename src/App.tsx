import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import './App.css'

type ViewMode = 'calculator' | 'password' | 'fileManager' | 'settings'
type SortMode = 'name' | 'size' | 'date' | 'type'
type FileType = 'image' | 'video' | 'gif' | 'folder' | 'other'

interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: FileType
  modified: Date
  parentId: string | null
  file?: File
  url?: string
}

interface HistoryItem {
  expression: string
  result: string
}

function App() {
  const [view, setView] = useState<ViewMode>('calculator')
  const [display, setDisplay] = useState('0')
  const [history, setHistory] = useState<string>('')
  const [fullExpression, setFullExpression] = useState<string>('')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [calcHistory, setCalcHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // 密码设置
  const [privatePassword, setPrivatePassword] = useState<string>(() => {
    return localStorage.getItem('privatePassword') || '8888'
  })
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 文件管理器状态
  const [allFiles, setAllFiles] = useState<FileItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortMode>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid')
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlCacheRef = useRef<Map<string, string>>(new Map())

  // 暗密码
  const SECRET_PASSWORD = '1234='

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }

    const newCode = secretCode + num
    setSecretCode(newCode.slice(-10))
  }

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    const checkCode = secretCode + nextOperation
    if (checkCode === SECRET_PASSWORD) {
      setView('password')
      setSecretCode('')
      return
    }
    setSecretCode(checkCode.slice(-10))

    if (previousValue === null) {
      setPreviousValue(inputValue)
      setFullExpression(display + ' ' + nextOperation + ' ')
      setHistory(display + ' ' + nextOperation)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setPreviousValue(newValue)
      setDisplay(String(newValue))
      setFullExpression(fullExpression + display + ' ' + nextOperation + ' ')
      setHistory(String(newValue) + ' ' + nextOperation)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+': return firstValue + secondValue
      case '-': return firstValue - secondValue
      case '×': return firstValue * secondValue
      case '÷': return firstValue / secondValue
      default: return secondValue
    }
  }

  const performCalculation = () => {
    const inputValue = parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      const finalExpression = fullExpression + display + ' ='

      setDisplay(String(newValue))
      setHistory(finalExpression)

      setCalcHistory(prev => [...prev, { expression: finalExpression, result: String(newValue) }])

      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
      setFullExpression('')
    }

    const checkCode = secretCode + '='
    if (checkCode === SECRET_PASSWORD) {
      setView('password')
      setSecretCode('')
    }
  }

  const clearAll = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
    setSecretCode('')
    setHistory('')
    setFullExpression('')
  }

  const deleteLast = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }

  const inputPercent = () => {
    const value = parseFloat(display)
    setDisplay(String(value / 100))
  }

  const inputDot = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const verifyPassword = () => {
    if (passwordInput === privatePassword) {
      setView('fileManager')
      setPasswordInput('')
    } else {
      alert('密码错误')
      setPasswordInput('')
    }
  }

  // 保存新密码
  const saveNewPassword = () => {
    if (newPasswordInput.length < 4) {
      setPasswordError('密码至少需要4位')
      return
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('两次输入的密码不一致')
      return
    }
    setPrivatePassword(newPasswordInput)
    localStorage.setItem('privatePassword', newPasswordInput)
    setPasswordError('')
    setNewPasswordInput('')
    setConfirmPasswordInput('')
    alert('密码修改成功！')
    setView('fileManager')
  }

  // 清理URL缓存
  const clearUrlCache = useCallback(() => {
    urlCacheRef.current.forEach(url => URL.revokeObjectURL(url))
    urlCacheRef.current.clear()
  }, [])

  // 选择文件夹
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files_list = e.target.files
    if (files_list && files_list.length > 0) {
      // 清理之前的缓存
      clearUrlCache()

      const parsedFiles: FileItem[] = []
      const folderMap = new Map<string, string>()

      for (let i = 0; i < files_list.length; i++) {
        const file = files_list[i]
        const pathParts = file.webkitRelativePath.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const parentPath = pathParts.slice(0, -1).join('/')

        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        let type: FileType = 'other'

        if (['jpg', 'jpeg', 'png', 'bmp', 'webp', 'svg'].includes(ext)) type = 'image'
        else if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv'].includes(ext)) type = 'video'
        else if (['gif'].includes(ext)) type = 'gif'

        if (type !== 'other') {
          const fileId = `file-${i}`
          let parentId: string | null = null

          if (parentPath) {
            if (!folderMap.has(parentPath)) {
              const folderId = `folder-${folderMap.size}`
              folderMap.set(parentPath, folderId)

              const grandParentPath = pathParts.slice(0, -2).join('/')
              const grandParentId = grandParentPath ? folderMap.get(grandParentPath) || null : null

              parsedFiles.push({
                id: folderId,
                name: pathParts[pathParts.length - 2] || pathParts[0],
                path: parentPath,
                size: 0,
                type: 'folder',
                modified: new Date(),
                parentId: grandParentId
              })
            }
            parentId = folderMap.get(parentPath) || null
          }

          parsedFiles.push({
            id: fileId,
            name: fileName,
            path: file.webkitRelativePath,
            size: file.size,
            type: type,
            modified: new Date(file.lastModified),
            parentId: parentId,
            file: file
          })
        }
      }

      setAllFiles(parsedFiles)
      setCurrentFolderId(null)
    }
  }

  // 获取当前文件夹内容
  const currentFiles = useMemo(() => {
    return allFiles.filter(f => f.parentId === currentFolderId)
  }, [allFiles, currentFolderId])

  // 获取当前路径
  const getCurrentPath = (): string => {
    if (!currentFolderId) return '根目录'
    const folder = allFiles.find(f => f.id === currentFolderId)
    return folder ? folder.name : '根目录'
  }

  // 返回上级
  const goBack = () => {
    if (!currentFolderId) {
      setView('calculator')
      return
    }
    const current = allFiles.find(f => f.id === currentFolderId)
    setCurrentFolderId(current?.parentId || null)
  }

  // 进入文件夹
  const enterFolder = (folder: FileItem) => {
    setCurrentFolderId(folder.id)
  }

  // 排序
  const sortFiles = (mode: SortMode) => {
    if (sortBy === mode) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(mode)
      setSortAsc(true)
    }
  }

  const getSortedFiles = () => {
    const sorted = [...currentFiles].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'date':
          comparison = a.modified.getTime() - b.modified.getTime()
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      return sortAsc ? comparison : -comparison
    })
    return sorted
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: FileType): string => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎬'
      case 'gif': return '🎭'
      case 'folder': return '📁'
      default: return '📄'
    }
  }

  const CalculatorButton = ({ label, onClick, className = '', double = false }: {
    label: string | React.ReactNode,
    onClick: () => void,
    className?: string,
    double?: boolean
  }) => (
    <button className={`calc-btn ${className} ${double ? 'double' : ''}`} onClick={onClick}>
      {label}
    </button>
  )

  // 缩略图组件
  const Thumbnail = ({ item, className }: { item: FileItem, className?: string }) => {
    const [url, setUrl] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
      if (item.file && (item.type === 'image' || item.type === 'gif' || item.type === 'video')) {
        const objectUrl = URL.createObjectURL(item.file)
        setUrl(objectUrl)
        return () => {
          URL.revokeObjectURL(objectUrl)
        }
      }
    }, [item])

    if (!url) {
      return <div className={`thumbnail-placeholder ${className}`}>{getFileIcon(item.type)}</div>
    }

    if (item.type === 'video') {
      return (
        <div className={`thumbnail-video ${className}`}>
          <video src={url} preload="metadata" />
          <span className="video-play-icon">▶</span>
        </div>
      )
    }

    return (
      <img
        src={url}
        alt={item.name}
        className={`thumbnail-image ${className} ${loaded ? 'loaded' : ''}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
    )
  }

  // 文件预览弹窗
  const FilePreviewModal = ({ item, onClose, onPrev, onNext, currentIndex, totalCount }: {
    item: FileItem,
    onClose: () => void,
    onPrev: () => void,
    onNext: () => void,
    currentIndex: number,
    totalCount: number
  }) => {
    const [url, setUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    useEffect(() => {
      if (item.file) {
        setLoading(true)
        const objectUrl = URL.createObjectURL(item.file)
        setUrl(objectUrl)
        return () => {
          URL.revokeObjectURL(objectUrl)
        }
      }
    }, [item])

    // 键盘导航
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') onPrev()
        if (e.key === 'ArrowRight') onNext()
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onPrev, onNext, onClose])

    // 触摸滑动
    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null)
      setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return
      const distance = touchStart - touchEnd
      const isLeftSwipe = distance > minSwipeDistance
      const isRightSwipe = distance < -minSwipeDistance
      if (isLeftSwipe) onNext()
      if (isRightSwipe) onPrev()
    }

    return (
      <div className="preview-modal" onClick={onClose}>
        <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
          <button className="preview-close" onClick={onClose}>✕</button>

          {/* 左右切换按钮 */}
          {totalCount > 1 && (
            <>
              <button
                className="preview-nav prev"
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                disabled={currentIndex === 0}
              >
                ‹
              </button>
              <button
                className="preview-nav next"
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                disabled={currentIndex === totalCount - 1}
              >
                ›
              </button>
            </>
          )}

          {/* 指示器 */}
          {totalCount > 1 && (
            <div className="preview-indicator">
              {currentIndex + 1} / {totalCount}
            </div>
          )}

          <div
            className="preview-media"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {loading && <div className="preview-loading">加载中...</div>}
            {item.type === 'image' && url && (
              <img src={url} alt={item.name} onLoad={() => setLoading(false)} draggable={false} />
            )}
            {item.type === 'gif' && url && (
              <img src={url} alt={item.name} className="gif-preview" onLoad={() => setLoading(false)} draggable={false} />
            )}
            {item.type === 'video' && url && (
              <video src={url} controls autoPlay onLoadedData={() => setLoading(false)} />
            )}
          </div>
          <div className="preview-info-bar">
            <span className="preview-title">{item.name}</span>
            <span className="preview-size">{formatSize(item.size)}</span>
          </div>
        </div>
      </div>
    )
  }

  // 密码界面
  if (view === 'password') {
    return (
      <div className="mobile-container">
        <div className="password-screen">
          <div className="password-container">
            <h2>🔒 软件管理</h2>
            <p>请输入密码进入</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="输入密码"
              className="password-input"
            />
            <div className="password-buttons">
              <button onClick={verifyPassword} className="btn-primary">进入</button>
              <button onClick={() => { setView('calculator'); setPasswordInput(''); }} className="btn-secondary">返回</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 设置界面
  if (view === 'settings') {
    return (
      <div className="mobile-container">
        <div className="password-screen">
          <div className="password-container settings">
            <h2>⚙️ 密码设置</h2>
            <p>修改私密空间密码</p>

            <div className="password-input-group">
              <label>新密码</label>
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="至少4位数字"
                className="password-input"
              />
            </div>

            <div className="password-input-group">
              <label>确认密码</label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="再次输入新密码"
                className="password-input"
              />
            </div>

            {passwordError && <p className="password-error">{passwordError}</p>}

            <div className="password-buttons">
              <button onClick={saveNewPassword} className="btn-primary">保存</button>
              <button onClick={() => {
                setView('fileManager')
                setPasswordError('')
                setNewPasswordInput('')
                setConfirmPasswordInput('')
              }} className="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 文件管理器界面
  if (view === 'fileManager') {
    const sortedFiles = getSortedFiles()
    const folders = sortedFiles.filter(f => f.type === 'folder')
    const mediaFiles = sortedFiles.filter(f => f.type !== 'folder')

    // 获取所有媒体文件（用于滑动切换）
    const allMediaFiles = sortedFiles.filter(f => f.type !== 'folder')
    const currentMediaIndex = previewItem ? allMediaFiles.findIndex(f => f.id === previewItem.id) : -1

    const goToPrevMedia = () => {
      if (currentMediaIndex > 0) {
        setPreviewItem(allMediaFiles[currentMediaIndex - 1])
      }
    }

    const goToNextMedia = () => {
      if (currentMediaIndex < allMediaFiles.length - 1) {
        setPreviewItem(allMediaFiles[currentMediaIndex + 1])
      }
    }

    return (
      <div className="mobile-container">
        <div className="file-manager">
          <div className="fm-header">
            <button onClick={goBack} className="btn-back">← 返回</button>
            <h2>📁 {getCurrentPath()}</h2>
            <button onClick={() => setView('settings')} className="btn-settings" title="设置密码">⚙️</button>
          </div>

          <div className="folder-select">
            <input
              type="file"
              ref={fileInputRef}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} className="btn-select-folder">
              📂 选择文件夹
            </button>
          </div>

          {allFiles.length > 0 && (
            <>
              <div className="fm-toolbar">
                <div className="view-toggle">
                  <button
                    className={displayMode === 'grid' ? 'active' : ''}
                    onClick={() => setDisplayMode('grid')}
                  >
                    ⊞ 宫格
                  </button>
                  <button
                    className={displayMode === 'list' ? 'active' : ''}
                    onClick={() => setDisplayMode('list')}
                  >
                    ☰ 列表
                  </button>
                </div>
                <div className="sort-buttons">
                  <button onClick={() => sortFiles('name')} className={sortBy === 'name' ? 'active' : ''}>
                    名称 {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
                  </button>
                  <button onClick={() => sortFiles('size')} className={sortBy === 'size' ? 'active' : ''}>
                    大小 {sortBy === 'size' && (sortAsc ? '↑' : '↓')}
                  </button>
                  <button onClick={() => sortFiles('date')} className={sortBy === 'date' ? 'active' : ''}>
                    日期 {sortBy === 'date' && (sortAsc ? '↑' : '↓')}
                  </button>
                </div>
              </div>

              <div className="fm-stats">
                <span>📁 {folders.length} 个文件夹</span>
                <span>📄 {mediaFiles.length} 个文件</span>
              </div>

              <div className={`fm-content ${displayMode}`}>
                {sortedFiles.length === 0 ? (
                  <div className="empty-state">
                    <p>此文件夹为空</p>
                  </div>
                ) : (
                  <>
                    {displayMode === 'grid' ? (
                      <div className="grid-view">
                        {sortedFiles.map((item) => (
                          <div
                            key={item.id}
                            className={`grid-item ${item.type}`}
                            onClick={() => {
                              if (item.type === 'folder') {
                                enterFolder(item)
                              } else {
                                setPreviewItem(item)
                              }
                            }}
                          >
                            {item.type === 'folder' ? (
                              <div className="grid-folder">
                                <span className="folder-icon-large">📁</span>
                                <span className="item-name">{item.name}</span>
                              </div>
                            ) : (
                              <>
                                <Thumbnail item={item} />
                                <span className="item-name-overlay">{item.name}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="list-view">
                        {sortedFiles.map((item) => (
                          <div
                            key={item.id}
                            className="list-item"
                            onClick={() => {
                              if (item.type === 'folder') {
                                enterFolder(item)
                              } else {
                                setPreviewItem(item)
                              }
                            }}
                          >
                            <div className="list-thumbnail">
                              {item.type === 'folder' ? (
                                <span className="list-folder-icon">📁</span>
                              ) : (
                                <Thumbnail item={item} />
                              )}
                            </div>
                            <div className="list-info">
                              <span className="list-name">{item.name}</span>
                              <span className="list-meta">
                                {item.type === 'folder' ? '文件夹' : formatSize(item.size)}
                                {' · '}
                                {item.modified.toLocaleDateString()}
                              </span>
                            </div>
                            <span className="list-arrow">{item.type === 'folder' ? '→' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {allFiles.length === 0 && (
            <div className="empty-state main">
              <p>📂 请选择文件夹</p>
              <p>支持浏览子文件夹、图片、视频、GIF</p>
            </div>
          )}
        </div>

        {previewItem && (
          <FilePreviewModal
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onPrev={goToPrevMedia}
            onNext={goToNextMedia}
            currentIndex={currentMediaIndex}
            totalCount={allMediaFiles.length}
          />
        )}
      </div>
    )
  }

  // 计算器界面
  return (
    <div className="mobile-container">
      <div className="calculator">
        <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
          🕐
        </button>

        {showHistory && (
          <div className="history-panel">
            <div className="history-header">
              <h3>计算历史</h3>
              <button onClick={() => setCalcHistory([])}>清空</button>
            </div>
            <div className="history-list">
              {calcHistory.length === 0 ? (
                <p className="no-history">暂无历史记录</p>
              ) : (
                calcHistory.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <span className="history-expr">{item.expression}</span>
                    <span className="history-result">{item.result}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="display-area">
          <div className="history-display">{history}</div>
          <div className="main-display">{display}</div>
        </div>

        <div className="keypad">
          <CalculatorButton label={display === '0' ? 'AC' : 'C'} onClick={clearAll} className="function" />
          <CalculatorButton label="⌫" onClick={deleteLast} className="function" />
          <CalculatorButton label="%" onClick={inputPercent} className="function" />
          <CalculatorButton label="÷" onClick={() => inputOperation('÷')} className="operator" />

          <CalculatorButton label="7" onClick={() => inputNumber('7')} />
          <CalculatorButton label="8" onClick={() => inputNumber('8')} />
          <CalculatorButton label="9" onClick={() => inputNumber('9')} />
          <CalculatorButton label="×" onClick={() => inputOperation('×')} className="operator" />

          <CalculatorButton label="4" onClick={() => inputNumber('4')} />
          <CalculatorButton label="5" onClick={() => inputNumber('5')} />
          <CalculatorButton label="6" onClick={() => inputNumber('6')} />
          <CalculatorButton label="-" onClick={() => inputOperation('-')} className="operator" />

          <CalculatorButton label="1" onClick={() => inputNumber('1')} />
          <CalculatorButton label="2" onClick={() => inputNumber('2')} />
          <CalculatorButton label="3" onClick={() => inputNumber('3')} />
          <CalculatorButton label="+" onClick={() => inputOperation('+')} className="operator" />

          <CalculatorButton label="0" onClick={() => inputNumber('0')} double />
          <CalculatorButton label="." onClick={inputDot} />
          <CalculatorButton label="=" onClick={performCalculation} className="operator" />
        </div>
      </div>
    </div>
  )
}

export default App
