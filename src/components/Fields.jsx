import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Users, Activity, X, Sprout, ChevronRight } from 'lucide-react'
import axios from "axios";
import api from '../api/api';

export default function Fields() {
    const [fields, setFields] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [showFarmerModal, setShowFarmerModal] = useState(false)
    const [selectedFieldId, setSelectedFieldId] = useState(null)
    const [activeMonitoringFieldId, setActiveMonitoringFieldId] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [farmerInput, setFarmerInput] = useState('')
    const [formData, setFormData] = useState({
        fieldName: '',
        area: '',
        measurementUnit: '',
        crops: ''
    })

    useEffect(() => {
        fetchFields()
    }, [])

    const fetchFields = async () => {
        try {
            const res = await api.get("/api/fields")
            setFields(res.data.data)
        } catch (error) {
            console.error("Failed to fetch fields", error)
        }
    }

    const handleInputChange = e => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post("/api/fields", formData)
            setFormData({ fieldName: '', area: 0.0, measurementUnit: '', crops: 0 })
            setEditingId(null)
            setShowForm(false)
            fetchFields()
        } catch (error) {
            console.error("Failed to save field:", error)
            alert(error.response?.data?.message || "Failed to save field")
        }
    }

    const handleDelete = id => {
        if (activeMonitoringFieldId === id) setActiveMonitoringFieldId(null)
        setFields(fields.filter(f => f.id !== id))
    }

    const handleEdit = field => {
        setFormData(field)
        setEditingId(field.id)
        setShowForm(true)
    }

    const openFarmerModal = id => {
        setSelectedFieldId(id)
        setShowFarmerModal(true)
    }

    const handleAddFarmer = () => {
        if (!farmerInput.trim()) return
        setFields(fields.map(f =>
            f.id === selectedFieldId
                ? { ...f, farmers: [...f.farmers, farmerInput.trim()] }
                : f
        ))
        setFarmerInput('')
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setFormData({ fieldName: '', area: 0.0, measurementUnit: '', crops: 0 })
        setEditingId(null)
    }

    const getSelectedField = () => fields.find(f => f.id === selectedFieldId)

    return (
        <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">
                            Farm Management
                        </p>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Fields</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {fields.length} {fields.length === 1 ? 'field' : 'fields'} registered
                        </p>
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Field
                    </button>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="grid gap-3 md:hidden">
                    {Array.isArray(fields) && fields.length > 0 ? fields.map(field => (
                        <div
                            key={field.id}
                            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="font-semibold text-gray-900">{field.fieldName}</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {field.area} {field.measurementUnit} · {field.crops} crops
                                    </p>
                                </div>
                                {activeMonitoringFieldId === field.id && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => openFarmerModal(field.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                                >
                                    <Users size={13} />
                                    {field.farmers?.length ?? 0} farmers
                                </button>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(field)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(field.id)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <Sprout size={32} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-400">No fields yet</p>
                            <p className="text-xs text-gray-300 mt-1">Add your first field to get started</p>
                        </div>
                    )}
                </div>

                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">All Fields</h2>
                    </div>

                    <table className="w-full">
                        <thead>
                        <tr>
                            {['Field', 'Area', 'Crops', 'Farmers', 'Status', ''].map((col, i) => (
                                <th
                                    key={i}
                                    className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                        {Array.isArray(fields) && fields.length > 0 ? fields.map(field => (
                            <tr key={field.id} className="group hover:bg-gray-50/70 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-semibold text-gray-900 text-sm">{field.fieldName}</span>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {field.area}
                                    <span className="ml-1 text-xs text-gray-400">{field.measurementUnit}</span>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600">{field.crops}</td>

                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => openFarmerModal(field.id)}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
                                    >
                                        <Users size={13} />
                                        {field.farmers?.length ?? 0} farmers
                                    </button>
                                </td>

                                <td className="px-6 py-4">
                                    {activeMonitoringFieldId === field.id ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Inactive</span>
                                    )}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                        <button
                                            onClick={() => handleEdit(field)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(field.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <Sprout size={32} className="text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-400">No fields registered</p>
                                    <p className="text-xs text-gray-300 mt-1">Click "Add Field" to create your first one</p>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* ── Add / Edit Modal ── */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl shadow-black/10 border border-gray-100"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {editingId ? 'Edit Field' : 'New Field'}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {editingId ? 'Update field details below' : 'Fill in the details to register a field'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseForm}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                                {/* Field Name */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        Field Name
                                    </label>
                                    <input
                                        name="fieldName"
                                        placeholder="e.g. North Paddock"
                                        value={formData.fieldName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                                    />
                                </div>

                                {/* Area + Unit */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        Area
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            name="area"
                                            placeholder="0.00"
                                            value={formData.area}
                                            onChange={handleInputChange}
                                            required
                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                                        />
                                        <select
                                            required
                                            name="measurementUnit"
                                            value={formData.measurementUnit}
                                            onChange={handleInputChange}
                                            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                                        >
                                            <option value="" disabled>Unit</option>
                                            <option value="sqm">sqm</option>
                                            <option value="hectare">hectare</option>
                                            <option value="acre">acre</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Crops */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        Crops
                                    </label>
                                    <input
                                        type="number"
                                        name="crops"
                                        placeholder="Number of crops"
                                        value={formData.crops}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200"
                                    >
                                        {editingId ? 'Save Changes' : 'Add Field'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="flex-1 bg-gray-100 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Farmer Modal ── */}
                {showFarmerModal && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl shadow-black/10 border border-gray-100">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Farmers</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">{getSelectedField()?.fieldName}</p>
                                </div>
                                <button
                                    onClick={() => setShowFarmerModal(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                {/* Add Input */}
                                <div className="flex gap-2">
                                    <input
                                        value={farmerInput}
                                        onChange={e => setFarmerInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleAddFarmer()}
                                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                                        placeholder="Farmer name"
                                    />
                                    <button
                                        onClick={handleAddFarmer}
                                        className="bg-green-600 text-white text-sm font-semibold px-4 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Farmer List */}
                                <div className="divide-y divide-gray-100">
                                    {getSelectedField()?.farmers?.length > 0 ? (
                                        getSelectedField()?.farmers.map((f, i) => (
                                            <div key={i} className="flex items-center gap-3 py-3">
                                                <div className="w-7 h-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-green-600">
                            {f.charAt(0).toUpperCase()}
                          </span>
                                                </div>
                                                <span className="text-sm text-gray-700">{f}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center">
                                            <Users size={24} className="text-gray-200 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">No farmers added yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100">
                                <button
                                    onClick={() => setShowFarmerModal(false)}
                                    className="w-full bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}