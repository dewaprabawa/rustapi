import { useState, useEffect } from 'react'
import { generateVocabSet, saveVocabSet, getVocabSets, getVocabSetWords, getConversationRequests, generateConversationScenario, testTts, deleteVocabSet, deleteVocabWord, getMasterData, updateVocabSet, updateVocabWord, getVocabGroups, createVocabGroup, updateVocabGroup, deleteVocabGroup } from '../services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Sub-components
import { VocabForgeHeader } from '../components/vocab/VocabForgeHeader'
import { VocabSetList } from '../components/vocab/VocabSetList'
import { VocabSetDetail } from '../components/vocab/VocabSetDetail'
import { VocabRequests } from '../components/vocab/VocabRequests'
import { VocabGroups } from '../components/vocab/VocabGroups'
import { GeneratorModal } from '../components/vocab/GeneratorModal'
import { PreviewModal } from '../components/vocab/PreviewModal'
import { GroupModal } from '../components/vocab/GroupModal'

export default function VocabForge() {
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'library' | 'requests' | 'groups'>('library')
  const [hospitalityTopics, setHospitalityTopics] = useState<string[]>([])
  const [libraryTab, setLibraryTab] = useState<'vocabulary' | 'phrasal_verbs'>('vocabulary')
  const [selectedSet, setSelectedSet] = useState<any>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [selectedWords, setSelectedWords] = useState<any[]>([])
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [isEditingSet, setIsEditingSet] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [creditMeta, setCreditMeta] = useState<any>(null)

  const [builderForm, setBuilderForm] = useState({
    topic: '',
    level: 'B1',
    word_count: 10,
    dialogue_sentence_count: 10,
    language: 'Indonesian',
    set_type: 'vocabulary',
    part_of_speech: '',
    group_id: ''
  })

  useEffect(() => {
    getMasterData("hospitality_topics")
      .then(data => {
        if (data?.options) setHospitalityTopics(data.options)
      })
      .catch(console.error)
  }, [])

  // Queries
  const { data: vocabSets = [], isLoading: isLoadingSets } = useQuery({
    queryKey: ['vocabSets', libraryTab],
    queryFn: () => getVocabSets(libraryTab)
  })

  const { data: vocabGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['vocabGroups'],
    queryFn: getVocabGroups
  })

  const { data: conversationRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['conversationRequests'],
    queryFn: getConversationRequests
  })

  // Mutations
  const generateMutation = useMutation({
    mutationFn: generateVocabSet,
    onSuccess: (data: any) => {
      setPreviewData(data.preview)
      setCreditMeta(data._meta)
      setIsGenerating(false)
      setIsPreviewOpen(true)
      setIsBuilderOpen(false)
    },
    onError: (err: any) => {
      setIsGenerating(false)
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Failed to generate vocabulary. Please try again."
      alert(msg)
    }
  })

  const saveMutation = useMutation({
    mutationFn: saveVocabSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabSets'] })
      setIsPreviewOpen(false)
      setPreviewData(null)
      alert("Vocab set saved successfully!")
    },
    onError: () => {
      alert("Failed to save vocab set.")
    }
  })

  const generateScenarioMutation = useMutation({
    mutationFn: generateConversationScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversationRequests'] })
      alert("Practice scenario generated successfully!")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to generate scenario."
      alert(msg)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVocabSet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabSets'] })
      setSelectedSet(null)
      setSelectedWords([])
    },
    onError: () => {
      alert("Failed to delete vocabulary set.")
    }
  })

  const deleteWordMutation = useMutation({
    mutationFn: ({ setId, wordId }: { setId: string, wordId: string }) => deleteVocabWord(setId, wordId),
    onSuccess: (_, variables) => {
      setSelectedWords(prev => prev.filter((w: any) => (w._id?.$oid || w._id) !== variables.wordId))
      queryClient.invalidateQueries({ queryKey: ['vocabSets'] })
    },
    onError: () => {
      alert("Failed to delete word.")
    }
  })

  const groupMutation = useMutation({
    mutationFn: (data: any) => {
      if (selectedGroup) {
        const id = selectedGroup._id?.$oid || selectedGroup._id
        return updateVocabGroup(id, data)
      }
      return createVocabGroup(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabGroups'] })
      setIsGroupModalOpen(false)
      setSelectedGroup(null)
      alert(`Group ${selectedGroup ? 'updated' : 'created'} successfully!`)
    },
    onError: () => alert("Failed to process group request.")
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => deleteVocabGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabGroups'] })
      setIsGroupModalOpen(false)
      setSelectedGroup(null)
      alert("Group deleted successfully!")
    },
    onError: () => alert("Failed to delete group.")
  })

  const playAudio = async (text: string, voiceId?: string) => {
    try {
      const blob = await testTts({ text, voice_id: voiceId || "" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (error) {
      console.error("ElevenLabs TTS failed, falling back to browser synthesis", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel(); 
      window.speechSynthesis.speak(utterance);
    }
  }

  const openSetDetails = async (set: any) => {
    setSelectedSet(set)
    try {
      const id = set._id?.$oid || set._id;
      const words = await getVocabSetWords(id)
      setSelectedWords(words)
    } catch (error) {
      console.error("Failed to fetch words", error)
    }
  }

  const handleUpdateWord = async (word: any) => {
    if (!selectedSet) return
    setSavingEdit(true)
    try {
      const setId = selectedSet._id?.$oid || selectedSet._id;
      const wordId = word._id?.$oid || word._id;
      await updateVocabWord(setId, wordId, word)
      setEditingWordId(null)
      const words = await getVocabSetWords(setId)
      setSelectedWords(words)
    } catch (error) {
      alert("Failed to update word")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleUpdateSet = async () => {
    if (!selectedSet) return
    setSavingEdit(true)
    try {
      const id = selectedSet._id?.$oid || selectedSet._id;
      await updateVocabSet(id, selectedSet)
      setIsEditingSet(false)
      queryClient.invalidateQueries({ queryKey: ['vocabSets'] })
    } catch (error) {
      alert("Failed to update set")
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <VocabForgeHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingRequestsCount={conversationRequests.filter((r: any) => r.status === 'pending').length}
        onGenerateClick={() => setIsBuilderOpen(true)}
      />

      {activeTab === 'library' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <VocabSetList 
            vocabSets={vocabSets}
            isLoading={isLoadingSets}
            selectedSet={selectedSet}
            libraryTab={libraryTab}
            setLibraryTab={setLibraryTab}
            onSetClick={openSetDetails}
          />
          <div className="lg:col-span-2">
            <VocabSetDetail 
              selectedSet={selectedSet}
              setSelectedSet={setSelectedSet}
              selectedWords={selectedWords}
              setSelectedWords={setSelectedWords}
              isEditingSet={isEditingSet}
              setIsEditingSet={setIsEditingSet}
              editingWordId={editingWordId}
              setEditingWordId={setEditingWordId}
              savingEdit={savingEdit}
              handleUpdateSet={handleUpdateSet}
              handleUpdateWord={handleUpdateWord}
              onDeleteSet={(id) => deleteMutation.mutate(id)}
              onDeleteWord={(setId, wordId) => deleteWordMutation.mutate({ setId, wordId })}
              playAudio={playAudio}
              isDeletingSet={deleteMutation.isPending}
            />
          </div>
        </div>
      ) : activeTab === 'requests' ? (
        <VocabRequests 
          conversationRequests={conversationRequests}
          isLoading={isLoadingRequests}
          onGenerateScenario={(id) => generateScenarioMutation.mutate(id)}
          isGenerating={generateScenarioMutation.isPending}
        />
      ) : (
        <VocabGroups 
          vocabGroups={vocabGroups}
          vocabSets={vocabSets}
          isLoading={isLoadingGroups}
          onNewGroup={() => {
            setSelectedGroup(null)
            setIsGroupModalOpen(true)
          }}
          onEditGroup={(group) => {
            setSelectedGroup(group)
            setIsGroupModalOpen(true)
          }}
        />
      )}

      <GeneratorModal 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        builderForm={builderForm}
        setBuilderForm={setBuilderForm}
        hospitalityTopics={hospitalityTopics}
        vocabGroups={vocabGroups}
        onGenerate={() => {
          setIsGenerating(true)
          generateMutation.mutate(builderForm)
        }}
        isGenerating={isGenerating}
      />

      <PreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
        setPreviewData={setPreviewData}
        onSave={() => {
          if (!previewData) return
          saveMutation.mutate({
            preview: previewData,
            level: builderForm.level,
            language: builderForm.language,
            topic: builderForm.topic,
            set_type: builderForm.set_type,
            group_id: builderForm.group_id
          })
        }}
        isSaving={saveMutation.isPending}
        playAudio={playAudio}
      />

      <GroupModal 
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false)
          setSelectedGroup(null)
        }}
        selectedGroup={selectedGroup}
        onSave={(data) => groupMutation.mutate(data)}
        onDelete={(id) => deleteGroupMutation.mutate(id)}
        isSaving={groupMutation.isPending}
        isDeleting={deleteGroupMutation.isPending}
      />
    </div>
  )
}
